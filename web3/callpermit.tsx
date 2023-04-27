import web3 from './web3';
const callPermitInterface = require('./abi/CallPermit.json');
const ethers = require('ethers');

const xTokensInstance = () => {
  const address = '0x000000000000000000000000000000000000080a';
  return new ethers.Contract(address, callPermitInterface.abi, web3().getSigner());
};

export default xTokensInstance;
