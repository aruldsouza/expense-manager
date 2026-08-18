const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (user) {
      // If user was created as a placeholder (invited to a group before registering), claim account
      if (user.password && user.password.startsWith('placeholder_pending_registration_')) {
        user.name = name.trim();
        user.password = hashedPassword;
        await user.save();
      } else {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (user.password && user.password.startsWith('placeholder_pending_registration_')) {
      return res.status(400).json({ error: 'Please register your account first to activate your invite' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: user._id, _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
};
