import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { initSchema } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';

let mongo;
let client;
let app;
let tokenA;
let tokenB;

before(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  const db = client.db('test');
  await initSchema(db);
  app = createApp(db);
  tokenA = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'a@co.com', password: 'password123' })
  ).body.token;
  tokenB = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'b@co.com', password: 'password123' })
  ).body.token;
});

after(async () => {
  await client.close();
  await mongo.stop();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const enquiry = (n) => ({
  name: `Student ${n}`,
  email: `s${n}@mail.com`,
  course_interest: 'Data Science',
});

test('register and login return JWTs without password hashes', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'a@co.com', password: 'password123' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.equal(login.body.employee.password_hash, undefined);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@co.com', password: 'password123' })
    ).status,
    401,
  );
});

test('public enquiries can be submitted and are visible only while unclaimed', async () => {
  const created = await request(app).post('/api/enquiries').send(enquiry(1));
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await request(app).get('/api/enquiries/unclaimed')).status, 401);
  assert.equal(
    (await request(app).post(`/api/enquiries/${id}/claim`).set(auth(tokenA))).status,
    200,
  );
  const unclaimed = await request(app).get('/api/enquiries/unclaimed').set(auth(tokenB));
  assert.ok(!unclaimed.body.enquiries.some((item) => item.id === id));
  const mine = await request(app).get('/api/enquiries/mine').set(auth(tokenA));
  assert.ok(mine.body.enquiries.some((item) => item.id === id));
});

test('claiming the same lead has one winner', async () => {
  const id = (await request(app).post('/api/enquiries').send(enquiry(2))).body.id;
  const results = await Promise.all([
    request(app).post(`/api/enquiries/${id}/claim`).set(auth(tokenA)),
    request(app).post(`/api/enquiries/${id}/claim`).set(auth(tokenB)),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
});
