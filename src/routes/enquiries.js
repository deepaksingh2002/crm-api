import express from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, 'Invalid phone number')
    .optional(),
  course_interest: z.string().trim().min(2).max(150),
  message: z.string().trim().max(1000).optional(),
});
const toEnquiry = ({ _id, ...item }) => ({ ...item, id: _id.toString() });

export default (db, { publicLimiter }) => {
  const router = express.Router();
  const enquiries = db.collection('enquiries');

  router.post('/', publicLimiter, validate(enquirySchema), async (req, res) => {
    const { name, email, phone = null, course_interest, message = null } = req.body;
    const result = await enquiries.insertOne({
      name,
      email,
      phone,
      course_interest,
      message,
      claimed_by: null,
      claimed_at: null,
      created_at: new Date(),
    });
    res
      .status(201)
      .json({ message: 'Enquiry submitted', id: result.insertedId.toString() });
  });

  router.get('/unclaimed', requireAuth, async (req, res) => {
    const rows = await enquiries
      .find({ claimed_by: null })
      .sort({ created_at: -1, _id: -1 })
      .toArray();
    res.json({ enquiries: rows.map(toEnquiry) });
  });

  router.get('/mine', requireAuth, async (req, res) => {
    const rows = await enquiries
      .find({ claimed_by: req.user.id })
      .sort({ claimed_at: -1, _id: -1 })
      .toArray();
    res.json({ enquiries: rows.map(toEnquiry) });
  });

  router.post('/:id/claim', requireAuth, async (req, res) => {
    if (!ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid enquiry id' });
    const id = new ObjectId(req.params.id);
    const result = await enquiries.findOneAndUpdate(
      { _id: id, claimed_by: null },
      { $set: { claimed_by: req.user.id, claimed_at: new Date() } },
      { returnDocument: 'after' },
    );
    if (result)
      return res.json({ message: 'Enquiry claimed', enquiry: toEnquiry(result) });
    if (!(await enquiries.findOne({ _id: id })))
      return res.status(404).json({ error: 'Enquiry not found' });
    res.status(409).json({ error: 'Enquiry already claimed' });
  });
  return router;
};
