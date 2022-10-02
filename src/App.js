import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import { algodClient, app_address, myAlgoConnect } from "./utils/constants";
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [globalCount, setGlobalCount] = useState(0);
  const [connector, setConnector] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loading1, setLoading1] = useState(false);

  //============================================= WALLET CONNECT ========================================//
  const checkIfWalletIsConnected = useCallback(async () => {
    try {
      if (!connector) {
        console.log("No connection");
        return;
      }

      const { accounts } = connector;

      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
        return
      } 
        
      setCurrentAccount(null);
      
    } catch (error) {
      console.log(error);
    }
  }, [connector]);

  const walletconnectConnect = async () => {
    try {
      const bridge = "https://bridge.walletconnect.org";
      const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });
      setConnector(connector);

      if (!connector.connected) {
        await connector.createSession();
      }

      if (connector.connected) {
        const { accounts } = connector;
        const account = accounts[0];
        setCurrentAccount(account);
      }

      connector.on("connect", (error, payload) => {
        if (error) {
          throw error;
        }
        // Get provided accounts
        const { accounts } = payload.params[0];
        
        setConnector(connector);
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
        setCurrentAccount(null);
        setConnector(null);
      });
    } catch (error) {
      console.log("something didn't work in creating connector", error);
    }
  };

  const closeConnection = async () => {
    connector.killSession();
    
    setConnector(null);
  };

  //=====================================================================================//

  const algoWalletConnect = async () => {
    myAlgoConnect
      .connect()
      .then((accounts) => {
        const _account = accounts[0];
        setCurrentAccount(_account.address);
      })
      .catch((error) => {
        console.log("Could not connect to MyAlgo wallet");
        console.error(error);
      });
  };

  //=====================================================================================//

  const disconnectWallet = () => {
    if (connector) {
      closeConnection();
    }
    setCurrentAccount(null);
  };

  const add = async () => {
    try {
      setLoading(true);
      // construct transaction
      let sender = currentAccount;
      let appArgs = [];
      appArgs.push(new Uint8Array(Buffer.from("Add")));
      let params = await algodClient.getTransactionParams().do();
      const txn = algosdk.makeApplicationNoOpTxn(
        sender,
        params,
        app_address,
        appArgs
      );
      let txId = txn.txID().toString();

      if (connector) {
        // time to sign . . . which we have to do with walletconnect api
        const txns = [txn];
        const txnsToSign = txns.map((txn) => {
          const encodedTxn = Buffer.from(
            algosdk.encodeUnsignedTransaction(txn)
          ).toString("base64");
          return {
            txn: encodedTxn,
          };
        });
        const requestParams = [txnsToSign];
        const request = formatJsonRpcRequest("algo_signTxn", requestParams);
        const result = await connector.sendCustomRequest(request);
        // have to go on phone and accept the transaction
        const decodedResult = result.map((element) => {
          return element
            ? new Uint8Array(Buffer.from(element, "base64"))
            : null;
        });
        // send and await
        await algodClient.sendRawTransaction(decodedResult).do();
      } else {
        // Sign & submit the transaction with algoconnect wallet
        let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
        await algodClient.sendRawTransaction(signedTxn.blob).do();
      }

      await algosdk.waitForConfirmation(algodClient, txId, 2);
      let transactionResponse = await algodClient
        .pendingTransactionInformation(txId)
        .do();
      if (transactionResponse["global-state-delta"] !== undefined) {

        await getCount();
      }

      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const deduct = async () => {
    try {
      setLoading1(true);
      // construct transaction
      let sender = currentAccount;
      let appArgs = [];
      appArgs.push(new Uint8Array(Buffer.from("Deduct")));
      let params = await algodClient.getTransactionParams().do();
      const txn = algosdk.makeApplicationNoOpTxn(
        sender,
        params,
        app_address,
        appArgs
      );
      let txId = txn.txID().toString();

      if (connector) {
        // time to sign . . . which we have to do with walletconnect api
        const txns = [txn];
        const txnsToSign = txns.map((txn) => {
          const encodedTxn = Buffer.from(
            algosdk.encodeUnsignedTransaction(txn)
          ).toString("base64");
          return {
            txn: encodedTxn,
          };
        });
        const requestParams = [txnsToSign];
        const request = formatJsonRpcRequest("algo_signTxn", requestParams);
        const result = await connector.sendCustomRequest(request);
        // have to go on phone and accept the transaction
        const decodedResult = result.map((element) => {
          return element
            ? new Uint8Array(Buffer.from(element, "base64"))
            : null;
        });
        // send and await
        await algodClient.sendRawTransaction(decodedResult).do();
      } else {
        // Sign & submit the transaction with algoconnect wallet
        let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
        
        await algodClient.sendRawTransaction(signedTxn.blob).do();
      }

      await algosdk.waitForConfirmation(algodClient, txId, 2);
      let transactionResponse = await algodClient
        .pendingTransactionInformation(txId)
        .do();
      
      if (transactionResponse["global-state-delta"] !== undefined) {
        
        await getCount();
      }
      setLoading1(false);
    } catch (error) {
      console.log(error);
      setLoading1(false);
    }
  };

  const getCount = async () => {
    let applicationInfoResponse = await algodClient
      .getApplicationByID(app_address)
      .do();
    let globalState = [];
    globalState = applicationInfoResponse["params"]["global-state"];
    
    setGlobalCount(globalState[0]["value"]["uint"]);
  };

  useEffect(() => {
    checkIfWalletIsConnected();

    getCount();
    
  }, [currentAccount, connector, checkIfWalletIsConnected]);

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">😉 woohoo!</div>
        <div className="bio">Cnu here. Plz connect your wallet!</div>
        {!currentAccount && (
          <>
            <button className="mathButton" onClick={walletconnectConnect}>
              Connect With WalletConnect
            </button>
            <button className="mathButton" onClick={algoWalletConnect}>
              Connect With AlgoWallet
            </button>
          </>
        )}
        {currentAccount && (
          <>
            <div className="count">{globalCount}</div>
            <button className="mathButton" onClick={add}>
              {loading ? (
                <i
                  className="fa fa-circle-o-notch fa-spin"
                  style={{ fontSize: "15px" }}
                ></i>
              ) : (
                "Add"
              )}
            </button>
            <button className="mathButton" onClick={deduct}>
              {loading1 ? (
                <i
                  className="fa fa-circle-o-notch fa-spin"
                  style={{ fontSize: "15px" }}
                ></i>
              ) : (
                "Deduct"
              )}
            </button>
            <button className="mathButton" onClick={disconnectWallet}>
              Disconnect Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
