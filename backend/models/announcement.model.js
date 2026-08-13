import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/announcements.json');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  tone: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  time: { type: String }
}, {
  timestamps: true
});

let MongooseAnnouncement;
try {
  MongooseAnnouncement = mongoose.model('Announcement');
} catch (e) {
  MongooseAnnouncement = mongoose.model('Announcement', announcementSchema);
}

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultAnnouncements = [
      {
        id: "ann_1",
        _id: "ann_1",
        title: "Rate parity alert — Goibibo",
        body: "Deluxe Courtyard is ₹450 below direct rate in Jaipur.",
        tone: "warning",
        time: "10 min ago"
      },
      {
        id: "ann_2",
        _id: "ann_2",
        title: "Database backup completed",
        body: "Daily automated backup for all 6 properties completed successfully.",
        tone: "success",
        time: "1 hr ago"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultAnnouncements, null, 2));
  }
};

const readAnnouncements = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeAnnouncements = (list) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
};

class AnnouncementInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }
}

const MockAnnouncement = {
  find: async (query = {}) => {
    let list = readAnnouncements();
    return list.slice().reverse().map(item => new AnnouncementInstance(item));
  },
  create: async (data) => {
    const list = readAnnouncements();
    const id = "ann_" + Math.random().toString(36).substring(2, 10);
    const newAnn = {
      id: id,
      _id: id,
      title: data.title,
      body: data.body,
      tone: data.tone || 'info',
      time: "Just now",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newAnn);
    writeAnnouncements(list);
    return new AnnouncementInstance(newAnn);
  }
};

const Announcement = {
  find: (query) => {
    return {
      then: async (onFulfilled) => {
        let result;
        if (mongoose.connection.readyState === 1) {
          result = await MongooseAnnouncement.find(query).sort({ createdAt: -1 });
        } else {
          result = await MockAnnouncement.find(query);
        }
        return onFulfilled ? onFulfilled(result) : result;
      }
    };
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseAnnouncement.create(data);
    }
    return await MockAnnouncement.create(data);
  }
};

export default Announcement;
