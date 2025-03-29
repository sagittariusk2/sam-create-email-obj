import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const database = new Databases(client);

  const doc = req.bodyJson.doc;
  log(`< [DOC: ${doc}] >`);

  try {
    var obj = await database.getDocument('sam-core', 'email-lists', doc);
    obj.list = obj.list.map((x) => JSON.parse(x));

    for (let mailObj of obj.list) {
      log(mailObj);
      await database.createDocument('sam-core', 'certificates', ID.unique(), {
        name: mailObj.name,
        email: mailObj.email,
        hour: mailObj.hour,
        email_list_id: doc,
      });
    }

    await database.updateDocument('sam-core', 'email-lists', doc, {
      status: 'IN_PROGRESS',
    });

    return res.json({
      status: 'success',
    });
  } catch (err) {
    error('Could not create new id: ' + err.message);
    return res.json({
      status: 'failed',
      error: err.message,
    });
  }
};
