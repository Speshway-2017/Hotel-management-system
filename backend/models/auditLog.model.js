import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/audit_logs.json');

const auditLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String },
  ip: { type: String },
  time: { type: String }
}, {
  timestamps: true
});

let MongooseAuditLog;
try {
  MongooseAuditLog = mongoose.model('AuditLog');
} catch (e) {
  MongooseAuditLog = mongoose.model('AuditLog', auditLogSchema);
}

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const defaultLogs = [
      {
        id: "L-88231",
        _id: "L-88231",
        user: "vikram.rathore@hourstay.in",
        action: "Updated seasonal rate plan",
        entity: "Diwali Peak · Jaipur",
        ip: "103.21.58.14",
        time: "11 Aug 2026, 18:42"
      },
      {
        id: "L-88230",
        _id: "L-88230",
        user: "sneha.d@hourstay.in",
        action: "Approved refund",
        entity: "HS24-10247",
        ip: "103.21.58.22",
        time: "11 Aug 2026, 17:10"
      },
      {
        id: "L-88229",
        _id: "L-88229",
        user: "superadmin@hourstay.in",
        action: "Created property",
        entity: "Hour Stay Aerocity",
        ip: "49.36.180.5",
        time: "10 Aug 2026, 12:03"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultLogs, null, 2));
  }
};

const readLogs = () => {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeLogs = (logs) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2));
};

class AuditLogInstance {
  constructor(data) {
    Object.assign(this, data);
    const cleanId = data.id || data._id;
    this.id = cleanId;
    this._id = cleanId;
  }
}

const MockAuditLog = {
  find: async (query = {}) => {
    let list = readLogs();
    return list.slice().reverse().map(l => new AuditLogInstance(l));
  },
  create: async (data) => {
    const list = readLogs();
    const id = "L-" + Math.floor(10000 + Math.random() * 90000);
    const newLog = {
      id: id,
      _id: id,
      user: data.user,
      action: data.action,
      entity: data.entity || '',
      ip: data.ip || '127.0.0.1',
      time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.push(newLog);
    writeLogs(list);
    return new AuditLogInstance(newLog);
  }
};

const AuditLog = {
  find: (query) => {
    return {
      then: async (onFulfilled) => {
        let result;
        if (mongoose.connection.readyState === 1) {
          result = await MongooseAuditLog.find(query).sort({ createdAt: -1 });
        } else {
          result = await MockAuditLog.find(query);
        }
        return onFulfilled ? onFulfilled(result) : result;
      }
    };
  },
  create: async (data) => {
    if (mongoose.connection.readyState === 1) {
      return await MongooseAuditLog.create(data);
    }
    return await MockAuditLog.create(data);
  }
};

export default AuditLog;
