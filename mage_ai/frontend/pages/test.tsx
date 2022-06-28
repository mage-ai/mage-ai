import { useEffect, useState } from 'react';
// import * as zmq from 'jszmq';

import CodeEditor from '@components/CodeEditor';
import Spacing from '@oracle/elements/Spacing';

import useWebSocket, { ReadyState } from 'react-use-websocket';

import Button from '@oracle/elements/Button';


// import net, { Socket } from 'net';

// var textFile = null
// function makeTextFile(text) {
//   var data = new Blob([text], {type: 'text/plain'});

//   // If we are replacing a previously generated file we need to
//   // manually revoke the object URL to avoid memory leaks.
//   if (textFile !== null) {
//     window.URL.revokeObjectURL(textFile);
//   }

//   textFile = window.URL.createObjectURL(data);

//   // returns a URL you can use as a href
//   return textFile;
// };

function Test() {
  console.log('render Test')

  const [messages, setMessages] = useState([]);
  // const sock = zmq.socket('pub');
  // sock.connect('ws://127.0.0.1:64875');

  // setInterval(function() {
  //   console.log('sending a multipart message envelope');
  //   sock.send(['kitty cats', 'meow!']);
  // }, 500);

  // console.log(net, Socket)

  // const client = new Socket;
  // client.connect({ port: 64875, host: '127.0.0.1' });
  // client.on('data', (data) => {
  //   console.log(data.toString('utf-8'));
  // });

  const socketUrlPublish = 'ws://localhost:6789/websocket/';
  // const socketUrlSubscribe = 'ws://localhost:6789/websocket/subscribe/';

  const {
    sendMessage,
    // sendJsonMessage,
    lastMessage,
    // lastJsonMessage,
    readyState,
    // getWebSocket,
  } = useWebSocket(socketUrlPublish, {
    onMessage: ({
      data: messageData,
    }) => {
      if (messageData) {
        setMessages([
          ...messages,
          JSON.parse(messageData),
        ]);
      }
    },
    onOpen: () => console.log('socketUrlPublish opened'),
    // Will attempt to reconnect on all close events, such as server shutting down
    shouldReconnect: (closeEvent) => true,
  });

  // console.log('readyState1', readyState)

  // const {
  //   // sendMessage,
  //   // sendJsonMessage,
  //   lastMessage,
  //   // lastJsonMessage,
  //   readyState: readyState2,
  //   // getWebSocket,
  // } = useWebSocket(socketUrlSubscribe, {
  //   // onMessage: (event) => console.log('onMessage', event),
  //   onOpen: () => console.log('socketUrlSubscribe opened'),
  //   // Will attempt to reconnect on all close events, such as server shutting down
  //   shouldReconnect: (closeEvent) => true,
  // });

  // console.log('readyState2', readyState2)

  // console.log('lastMessage', lastMessage?.data);

  // console.log('WTFFFFFFFF', lastMessage?.data)

  // const {
  //   data,
  //   type: dataType,
  // } = lastMessage?.data ? JSON.parse(lastMessage?.data) : {};



//   useEffect(() => {
//     // const sendMessageInterval = setInterval(() => {
//     //   console.log('sendMessage')
//     //   sendMessage(String(new Date()));
//     // }, 1000);

//     // return () => {
//     //   clearInterval(sendMessageInterval);
//     // };

//     sendMessage(`
// from datetime import datetime

// print(datetime.utcnow())
//     `)
//   }, [sendMessage]);
  console.log(messages.length);

  return (
    <Spacing p={5}>

      {messages.map(({
        data,
        type: dataType,
      }) => {
        return (
          <>
            {dataType === 'text' && data}
            {dataType === 'text/plain' && data}
            {dataType === 'image/png' && <img src={`data:image/png;base64, ${data}`} />}
          </>
        );
      })}

      <CodeEditor
        // autoSave
        defaultValue={`import mysql.connector
import os
import pandas as pd


def query(sql):
    mydb = mysql.connector.connect(
      host='mage-development.cxj4djmtpwkx.us-west-2.rds.amazonaws.com',
      user='root',
      password=os.getenv('DB_PASSWORD'),
      database='materia_development',
    )
    mycursor = mydb.cursor()

    mycursor.execute(sql)

    return mycursor.fetchall()


def query_table(table_name):
    columns = [r[0] for r in query(f'DESCRIBE {table_name}')]
    rows = query(f'SELECT * FROM {table_name}')

    return pd.DataFrame(rows, columns=columns)


import mage_ai


# df = query_table('materia_development.model_with_versions')
# mage_ai.connect_data(df, 'model_with_versions')

df = query_table('materia_development.features_with_feature_sets')
mage_ai.connect_data(df, 'features_with_feature_sets')
        `}
        height="calc(100vh - 90px)"
        onSave={(value: string) => {
          // console.log(`Saving...\n${value}`);
          setMessages([]);
          sendMessage(JSON.stringify({
            code: value,
          }));
        }}
        width="calc(100vw - 90px)"
      />
    </Spacing>
  );
}

export default Test;
