const request = require('supertest');

// Mock aws-jwt-verify before requiring app
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: jest.fn().mockImplementation(async (token) => {
        if (token === 'valid-token-user1') {
          return { sub: 'user-sub-1', username: 'user1', email: 'user1@test.com' };
        }
        if (token === 'valid-token-user2') {
          return { sub: 'user-sub-2', username: 'user2', email: 'user2@test.com' };
        }
        throw new Error('Token verification failed');
      }),
    }),
  },
}));

// Mock mongoose
jest.mock('mongoose', () => {
  const notes = [];
  let idCounter = 1;

  const generateId = () => {
    const id = String(idCounter++).padStart(24, '0');
    return id;
  };

  const ModelMock = {
    find: jest.fn((filter) => {
      const { ownerSub, $or, tags } = filter;
      let result = notes.filter((n) => n.ownerSub === ownerSub);
      if ($or) {
        result = result.filter((n) =>
          $or.some((cond) => {
            if (cond.title) return cond.title.test(n.title);
            if (cond.content) return cond.content.test(n.content);
            return false;
          })
        );
      }
      if (tags) result = result.filter((n) => n.tags.includes(tags));
      return { sort: () => ({ lean: () => Promise.resolve(result) }) };
    }),
    create: jest.fn(async (data) => {
      const note = { ...data, _id: generateId(), createdAt: new Date(), updatedAt: new Date() };
      notes.push(note);
      return note;
    }),
    findOneAndUpdate: jest.fn(async (filter, update, opts) => {
      const idx = notes.findIndex(
        (n) => n._id === filter._id && n.ownerSub === filter.ownerSub
      );
      if (idx === -1) return null;
      notes[idx] = { ...notes[idx], ...update, updatedAt: new Date() };
      return notes[idx];
    }),
    findOneAndDelete: jest.fn(async (filter) => {
      const idx = notes.findIndex(
        (n) => n._id === filter._id && n.ownerSub === filter.ownerSub
      );
      if (idx === -1) return null;
      return notes.splice(idx, 1)[0];
    }),
    findOne: jest.fn(async (filter) => {
      const note = notes.find((n) => n._id === filter._id && n.ownerSub === filter.ownerSub);
      if (!note) return null;
      return { ...note, save: jest.fn(async () => { note.isPinned = !note.isPinned; return note; }) };
    }),
  };

  return {
    connect: jest.fn().mockResolvedValue({ connection: { host: 'mock-host' } }),
    model: jest.fn(() => ModelMock),
    Schema: jest.fn().mockImplementation(function (def, opts) {
      this.pre = jest.fn();
      this.index = jest.fn();
    }),
  };
});

// Mock redis
jest.mock('../config/redis', () => ({
  connectRedis: jest.fn(),
  getRedisClient: jest.fn(() => null),
  isRedisAvailable: jest.fn(() => false),
}));

// Mock db
jest.mock('../config/db', () => jest.fn().mockResolvedValue(undefined));

// Set env before requiring app
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
process.env.COGNITO_CLIENT_ID = 'test-client-id';

const app = require('../app');

describe('Health endpoint', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth endpoint', () => {
  it('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with valid token returns user info', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token-user1');
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe('user-sub-1');
  });
});

describe('Notes CRUD', () => {
  let noteId;

  it('POST /api/notes creates a note for user1', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', 'Bearer valid-token-user1')
      .send({ title: 'My First Note', content: 'Hello world', tags: ['test'], color: 'blue' });
    expect(res.status).toBe(201);
    expect(res.body.note.title).toBe('My First Note');
    expect(res.body.note.ownerSub).toBe('user-sub-1');
    noteId = res.body.note._id;
  });

  it('POST /api/notes fails without title', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', 'Bearer valid-token-user1')
      .send({ content: 'No title here' });
    expect(res.status).toBe(400);
  });

  it('GET /api/notes returns notes for authenticated user', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer valid-token-user1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notes)).toBe(true);
    expect(res.body.notes.length).toBeGreaterThan(0);
  });

  it('GET /api/notes without token returns 401', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });

  it('User isolation: user2 cannot access user1 notes via GET', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer valid-token-user2');
    expect(res.status).toBe(200);
    expect(res.body.notes.length).toBe(0); // user2 has no notes
  });

  it('User isolation: user2 cannot delete user1 note', async () => {
    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', 'Bearer valid-token-user2');
    expect(res.status).toBe(404);
  });

  it('PUT /api/notes/:id updates user1 note', async () => {
    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set('Authorization', 'Bearer valid-token-user1')
      .send({ title: 'Updated Title', content: 'Updated content', tags: ['updated'], color: 'green' });
    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe('Updated Title');
  });

  it('PUT /api/notes/:id with invalid ID returns 400', async () => {
    const res = await request(app)
      .put('/api/notes/not-a-valid-id')
      .set('Authorization', 'Bearer valid-token-user1')
      .send({ title: 'Test', content: '' });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/notes/:id deletes user1 note', async () => {
    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', 'Bearer valid-token-user1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Note deleted.');
  });
});
