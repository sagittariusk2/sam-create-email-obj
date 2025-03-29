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
    await database.updateDocument('sam-core', 'email-lists', doc, {
      status: 'IN_PROGRESS',
    });
    
    var obj = await database.getDocument('sam-core', 'email-lists', doc);
    obj.list = obj.list.map((x) => JSON.parse(x));

    let x = (await database.getDocument("sam-core", "metadata", "'sam-core'")).lastCertId;
    let year = parseInt(x.split("/")[1]);
    let id = parseInt(x.split("/")[0].substring(1));

    const currentYear = new Date().getFullYear();
    if(currentYear !== year) {
      id = 0;
      year = currentYear;
    }
  

    for (let mailObj of obj.list) {
      let success = false;
      while (!success) {
        try {
          certID = `V${id.toString().padStart(6, 0)}/${year}`;
          await database.createDocument('sam-core', 'certificates', ID.unique(), {
            name: mailObj.name,
            email: mailObj.email,
            hour: parseInt(mailObj.hour),
            email_list_id: doc,
            certificate_id: certID
          });
          log('Created the certificate with id - ' + certID);
          await database.updateDocument('sam-core', "metadata", 'sam-core', {lastCertId: certID})
          success = true;
        } catch (e) {
          if (e.code === 409) {
            id++;
          } else {
            error('Could not create new certificate id: ' + e.message);
            return res.json({
              status: 'failed',
              error: e.message,
            });
          }
          log(error.code, error);
        }
      }
    }

    return res.json({
      status: 'success',
    });
  } catch (err) {
    error('Failed: ' + err.message);
    return res.json({
      status: 'failed',
      error: err.message,
    });
  }
};
