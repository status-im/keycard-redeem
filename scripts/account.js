const fs = require('fs');

module.exports = class Account {
  constructor(web3) {
    this.web3 = web3;
    this.sender = null;
  }

  async init(argv) {
    if (argv["account"]) {
      if (!argv["passfile"]) {
        console.error("the --passfile option must be specified when using the --account option");
        process.exit(1);
      }

      if (argv["sender"]) {
        console.warn("--account used, --sender will be ignored");
      }

      this.sender = this.loadAccount(argv["account"], argv["passfile"]);
    } else {
      this.sender = argv["sender"] || await this.getDefaultSender();
    }
  }

  async getDefaultSender() {
    let accounts = await this.web3.eth.getAccounts();
    return accounts[0];
  }


  loadAccount(account, passfile) {
    let json = fs.readFileSync(account, "utf-8");
    let pass = fs.readFileSync(passfile, "utf-8").split("\n")[0].replace("\r", "");
    return this.web3.eth.accounts.decrypt(json, pass);
  }

  async sendMethod(methodCall, to) {
    let receipt;

    if (typeof(this.sender) == "string") {
      let gasAmount = await methodCall.estimateGas({from: this.sender});
      receipt = await methodCall.send({from: this.sender, gas: gasAmount});
    } else {
      let gasAmount = await methodCall.estimateGas({from: this.sender.address});
      let data = methodCall.encodeABI();
      let signedTx = await this.sender.signTransaction({to: to, data: data, gas: gasAmount});
      receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    }

    return receipt;
  }

  senderAddress() {
    if (typeof(this.sender) == "string") {
      return this.sender;
    } else {
      return this.sender.address;
    }
  }
}