const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const assets = [
  { s3_url: 'https://cdn.pixabay.com/photo/2016/03/31/18/36/bird-1294458_1280.png', tags: ['bird', 'player', 'yellow'] },
  { s3_url: 'https://cdn.pixabay.com/photo/2017/01/31/13/50/elon-musk-2024227_1280.png', tags: ['elon', 'musk', 'head', 'enemy'] },
  { s3_url: 'https://cdn.pixabay.com/photo/2013/07/12/19/27/rocket-154772_1280.png', tags: ['rocket', 'bullet', 'projectile'] },
  { s3_url: 'https://cdn.pixabay.com/photo/2012/04/13/21/02/rock-33633_1280.png', tags: ['rock', 'obstacle', 'asteroid'] },
  { s3_url: 'https://cdn.pixabay.com/photo/2012/04/02/16/07/coin-24844_1280.png', tags: ['coin', 'collectible', 'gold'] },
  { s3_url: 'https://cdn.pixabay.com/photo/2017/01/10/03/54/doge-1968257_1280.png', tags: ['doge', 'coin', 'dog'] }
];

async function seed() {
  const { data, error } = await supabase.from('assets').insert(assets);
  if (error) console.error('Error seeding assets:', error);
  else console.log('Assets seeded successfully');
}

seed();
