import mongoose from 'mongoose';
import dns from 'dns';

// Set Node.js to use Google public DNS resolvers to bypass local Windows SRV lookup restrictions
dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = 'mongodb+srv://pms123:dQiJwjXXZ3LsrSl7@cluster0.v6otvjv.mongodb.net/hourstay_hms';

const test = async () => {
  console.log('Testing SRV connection with Google DNS resolvers...');
  try {
    await mongoose.connect(uri);
    console.log('✅ SRV Success with Google DNS!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ SRV Failed:', err.message);
  }
};

test();
