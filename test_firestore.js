import { Firestore } from '@google-cloud/firestore';

async function test() {
  try {
    const db = new Firestore({
      projectId: 'amarach-sacco',
      databaseId: 'ai-studio-3e95b127-821b-45e5-bccb-27cb3feb4673'
    });
    const collections = await db.listCollections();
    console.log('Collections:', collections.map(c => c.id));
  } catch (err) {
    console.error(err);
  }
}
test();
