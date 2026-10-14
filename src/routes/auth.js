import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const email = z.string().trim().toLowerCase().email().max(254);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});
const loginSchema = z.object({ email, password: z.string().min(1).max(72) });
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

export default (db) => {
  const router = express.Router();
  const sign = (employee) =>
    jwt.sign({ email: employee.email }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: String(employee.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

  router.post('/register', validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const result = await db.collection('employees').insertOne({
        name,
        email,
        password_hash: await bcrypt.hash(password, 10),
        created_at: new Date(),
      });
      const employee = { id: result.insertedId.toString(), name, email };
      res.status(201).json({ employee, token: sign(employee) });
    } catch (err) {
      if (err.code === 11000)
        return res.status(409).json({ error: 'Email already registered' });
      throw err;
    }
  });

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const employee = await db.collection('employees').findOne({ email });
    const valid = await bcrypt.compare(password, employee?.password_hash || DUMMY_HASH);
    if (!employee || !valid)
      return res.status(401).json({ error: 'Invalid email or password' });
    const result = {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
    };
    res.json({ employee: result, token: sign(result) });
  });
  return router;
};
