const AWS = require('aws-sdk');
const ses = new AWS.SES({region: 'us-east-1'});
const dynamoDB = new AWS.DynamoDB();
const client  = new AWS.DynamoDB.DocumentClient();
const tableName = "csye6225"; 
const emailSource = process.env.EMAIL_SOURCE;
console.log(emailSource);
exports.handler = (event, context, callback) => {
  const message = JSON.parse(event.Records[0].Sns.Message);
  
  const query = {
    TableName: tableName,
    ExpressionAttributeNames: {
     "#BID":  "bookId",
     "#EM":  "email",
     "#TYPE":  "type"
    }, 
    ExpressionAttributeValues: {
     ":bookId": "3",
     ":email": message.email,
     ":type": message.type
    }, 
    FilterExpression: "#BID = :bookId AND #EM = :email AND #TYPE = :type",
    ConsistentRead: true 
  }
  client.scan(query, (err, data)=>{
    if(err) {
      console.log(err);
    }else {
      console.log("Scan succeeded.");
      if (data.Count==0) {
        sendEmail();
      }else {
        
      }
    }
  });
  
  function sendEmail() {
    const params = {
      Destination: {
        ToAddresses: [message.email]
      },
      Source: emailSource,
      Message: {
        Subject: {
          Data:"Webapp Notification"
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: getHTMLData()
          }
        }
      }
    };
    const sendPromise = ses.sendEmail(params).promise();
    sendPromise.then(
    function(data) {
      console.log(`Email sent, MessageId: ${data.MessageId}`);
      uploadData();
    }).catch(
      function(err) {
      console.error(err, err.stack);
    });
  }
  
  function getHTMLData() {
    let link = "<br/>";
    if(message.link) {
      link = `<a href="${message.link}">${message.link}</a>`;
    }
    return `<html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    </head>
    <body>
      <h1>You just managed to ${message.type} a book!</h1>
      <p>Book ID: ${message.bookId}</p>
      <p>Book name: ${message.bookName}</p>
      ${link}
    </body>
    </html>`;
  }
  
  function uploadData() {
    const params = {
      Item: {
        'id': event.Records[0].Sns.MessageId,
        'email': message.email,
        'bookId': message.bookId,
        'bookName': message.bookName,
        'type': message.type,
        'link': message.link
      },
      TableName: tableName
    };
    console.log("Adding a new item...");
    client.put(params, (err, data)=>{
        if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
      }
    });
  }
};