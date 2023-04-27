const ethers = require('ethers');
declare let ethereum: any;

const web3 = () => {
  if (typeof ethereum !== 'undefined') {
    // We are in the browser and MetaMask is running
    return new ethers.providers.Web3Provider(ethereum);
  }
};

export default web3;
