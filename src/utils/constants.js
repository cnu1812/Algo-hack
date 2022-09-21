import algosdk from "algosdk";
import MyAlgoConnect from "@randlabs/myalgo-connect";

const config = {
  algodToken: "",
  algodServer: "https://node.testnet.algoexplorerapi.io",
  algodPort: "",
};

export const algodClient = new algosdk.Algodv2(
  config.algodToken,
  config.algodServer,
  config.algodPort
);

export const myAlgoConnect = new MyAlgoConnect();

export const app_address = 94361442;
