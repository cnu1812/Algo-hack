import React, { useEffect, useState } from 'react';
import './App.css';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";

const App = () => {
 const [currentAccount, setCurrentAccount] = useState();
 const [globalCount, setGlobalCount] = useState(0);
 const [walletbalance, setwalletbalance] = useState();
 const [connector, setConnector] = useState();
 const [connected, setConnected] = useState(false);

 const app_address = 94361442;

 const algodToken =
 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
 const algodServer = "http://localhost";
 const algodPort = 4001;
 const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

  
 const checkIfWalletIsConnected = async () => {
  try {
   if (!connector.connected) {
    console.log("No connection");
    return;
   } else {
    console.log("We have connection", connector);
   }
   const { accounts } = connector;

   if (accounts.length !== 0) {
    const account = accounts[0];
    console.log("Found an authorized account:", account);
    setCurrentAccount(account);
   } else {
    setCurrentAccount();
    console.log("No authorized account found");
   }
  } catch (error) {
   console.log(error);
  }
 };

 const connectWallet = async () => {
  try {
   const bridge = "https://bridge.walletconnect.org";
   const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });
   setConnector(connector);

   if (!connector.connected) {
    await connector.createSession();
    console.log("Creating new connector session");
   }

   if (connector.connected) {
    const { accounts } = connector;
    const account = accounts[0];
    setCurrentAccount(account);
    setConnected(true);
   }

   connector.on("connect", (error, payload) => {
    if (error) {
     throw error;
    }
    // Get provided accounts
    const { accounts } = payload.params[0];
    console.log(
     "connector.on connect: Connected an account with address:",
     accounts[0]
    );
    setConnector(connector);
    setConnected(true);
    setCurrentAccount(accounts[0]);
   });

   connector.on("session_update", (error, payload) => {
    if (error) {
     throw error;
    }
    // Get updated accounts
    const { accounts } = payload.params[0];
    setCurrentAccount(accounts[0]);
   });

   connector.on("disconnect", (error, payload) => {
    if (error) {
     throw error;
    }
    setCurrentAccount();
    setConnected(false);
    setConnector();
   });
  } catch (error) {
   console.log("something didn't work in creating connector", error);
  }
 };

 const disconnectWallet = async () => {
  connector.killSession();
  console.log("Killing session for wallet with address: ", currentAccount);
  setCurrentAccount();
  setConnector();
  setConnected(false);
 };
  
 const add = async () => {
  // construct transaction
  let sender = currentAccount;
  let appArgs = [];
  appArgs.push(new Uint8Array(Buffer.from("Add")));
  let params = await algodClient.getTransactionParams().do();
  const txn = algosdk.makeApplicationNoOpTxn(sender, params, app_address, appArgs);
  let txId = txn.txID().toString();

  // time to sign . . . which we have to do with walletconnect api
  const txns = [txn]
  const txnsToSign = txns.map(txn => {
   const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
   return {
    txn: encodedTxn,
   };
  });
  const requestParams = [ txnsToSign ];
  const request = formatJsonRpcRequest("algo_signTxn", requestParams);
  const result = await connector.sendCustomRequest(request);
  // have to go on phone and accept the transaction
  const decodedResult = result.map(element => {
  return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
  });
  // send and await
  await algodClient.sendRawTransaction(decodedResult).do();
  await algosdk.waitForConfirmation(algodClient, txId, 2);
  let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
  console.log("Called app-id:",transactionResponse['txn']['txn']['apid']);
  if (transactionResponse['global-state-delta'] !== undefined ) {
   console.log("Global State updated:",transactionResponse['global-state-delta']);
   await getCount();
  }

 }

 const deduct = async () => {
  // construct transaction
  let sender = currentAccount;
  let appArgs = [];
  appArgs.push(new Uint8Array(Buffer.from("Deduct")));
  let params = await algodClient.getTransactionParams().do();
  const txn = algosdk.makeApplicationNoOpTxn(sender, params, app_address, appArgs);
  let txId = txn.txID().toString();

  // time to sign . . . which we have to do with walletconnect api
  const txns = [txn]
  const txnsToSign = txns.map(txn => {
   const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
   return {
    txn: encodedTxn,
   };
  });
  const requestParams = [ txnsToSign ];
  const request = formatJsonRpcRequest("algo_signTxn", requestParams);
  const result = await connector.sendCustomRequest(request);
  // have to go on phone and accept the transaction
  const decodedResult = result.map(element => {
  return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
  });
  // send and await
  await algodClient.sendRawTransaction(decodedResult).do();
  await algosdk.waitForConfirmation(algodClient, txId, 2);
  let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
  console.log("Called app-id:",transactionResponse['txn']['txn']['apid']);
  if (transactionResponse['global-state-delta'] !== undefined ) {
   console.log("Global State updated:",transactionResponse['global-state-delta']);
   await getCount();
  }

 }

 const getCount = async () => {
  let applicationInfoResponse = await algodClient.getApplicationByID(app_address).do();
  let globalState = []
  globalState = applicationInfoResponse['params']['global-state']
  console.log("count is: ", globalState[0]['value']['uint']);
  setGlobalCount(globalState[0]['value']['uint']);
 }


 useEffect(() => {
  checkIfWalletIsConnected();
  getCount();
  console.log('currentAccount:', currentAccount);
 }, [currentAccount])

 return (
  <div className = "mainContainer">
   <div className = "dataContainer">
    <div className="header">
    😉 woohoo!
    </div>
    <div className="bio">
    Cnu here. Plz connect your wallet!
    </div>
    {!currentAccount && (
     <button className="mathButton" onClick={connectWallet}>
      Connect Wallet
     </button>
    )}
    {currentAccount && (
    <>
    <div className = "count">
     {globalCount}
    </div>
    <button className="mathButton" onClick={add}>
     Add
    </button>
    <button className="mathButton" onClick={deduct}>
     Deduct
    </button>
    <button className="mathButton" onClick={disconnectWallet}>
     Disconnect Wallet
    </button>
    </>
    )}
   </div>
  </div>
 );
}

export default App;