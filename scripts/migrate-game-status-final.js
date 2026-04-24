const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Game = require('../src/models/game.model');

async function main() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error('Missing MONGODB_URL in environment (.env)');
  }

  await mongoose.connect(mongoUrl);

  const result = await Game.updateMany(
    {
      endGame: true,
      $or: [{ status: { $exists: false } }, { status: null }],
    },
    [
      {
        $set: {
          status: 'final',
          endDateTime: { $ifNull: ['$endDateTime', '$updatedAt'] },
        },
      },
    ]
  );

  // eslint-disable-next-line no-console
  console.log(
    `Updated ${result.modifiedCount ?? result.nModified ?? 0} game(s) to status=final.`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});

