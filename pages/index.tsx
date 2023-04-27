import React, { useEffect, useState } from 'react';
import { Container, Button, Menu, Icon, Input, Form, Message, Label } from 'semantic-ui-react';
import Head from 'next/head';
import Link from 'next/link';
import * as ethers from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import callPermitInstance from '../web3/callpermit';

const XCMTransactorDemo = () => {
  // Initial State
  const [account, setAccount] = useState('Not Connected');
  const [connected, setConnected] = useState(false);
  const [networkName, setNetworkName] = useState('Not Connected');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [value, setValue] = useState(BigInt(0));
  const [data, setData] = useState('');
  const [gasLimit, setGaslimit] = useState(BigInt(0));
  const [deadline, setDeadline] = useState(BigInt(0));
  const [signature, setSignature] = useState({ r: '', s: '', v: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async () => {
      await checkMetamask();
    };

    // Check for changes in Metamask (account and chain)
    if (window.ethereum) {
      (window as any).ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      (window as any).ethereum.on('accountsChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const checkMetamask = async () => {
    const provider = (await detectEthereumProvider({ mustBeMetaMask: true })) as any;

    if (provider) {
      const chainId = await provider.request({
        method: 'eth_chainId',
      });

      let networkName;
      switch (chainId) {
        case '0x507':
          networkName = 'Moonbase Alpha';
          break;
        default:
          networkName = '';
          setAccount('Only Moonbase Alpha Supported');
          break;
      }
      if (networkName !== '') {
        setNetworkName(networkName);
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });

        // Update State
        if (accounts) {
          setAccount(ethers.utils.getAddress(accounts[0]));
          setFrom(ethers.utils.getAddress(accounts[0]));
          // Get Nonce
          setConnected(true);
        }
      }
    } else {
      // MetaMask not detected
      setAccount('MetaMask not Detected');
    }
  };

  const onConnect = async () => {
    await checkMetamask();
  };

  const createPermitMessageData = function (nonce) {
    // Message to Sign
    const message = {
      from: from,
      to: to,
      value: value.toString(),
      data: data,
      gaslimit: gasLimit.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };

    const typedData = JSON.stringify({
      types: {
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'verifyingContract',
            type: 'address',
          },
        ],
        CallPermit: [
          {
            name: 'from',
            type: 'address',
          },
          {
            name: 'to',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'data',
            type: 'bytes',
          },
          {
            name: 'gaslimit',
            type: 'uint64',
          },
          {
            name: 'nonce',
            type: 'uint256',
          },
          {
            name: 'deadline',
            type: 'uint256',
          },
        ],
      },
      primaryType: 'CallPermit',
      domain: {
        name: 'Call Permit Precompile',
        version: '1',
        chainId: 1287,
        verifyingContract: '0x000000000000000000000000000000000000080a',
      },
      message: message,
    });

    return {
      typedData,
      message,
    };
  };

  const signData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const nonce = await callPermitInstance().nonces(ethers.utils.getAddress(account));

      const provider = (await detectEthereumProvider({ mustBeMetaMask: true })) as any;
      const method = 'eth_signTypedData_v4';
      const messageData = createPermitMessageData(nonce);
      const params = [from, messageData.typedData];

      provider.sendAsync(
        {
          method,
          params,
          from,
        },
        function (err, result) {
          if (err) return console.dir(err);
          if (result.error) {
            alert(result.error.message);
            return console.error('ERROR', result);
          }
          //console.log('Signature:' + JSON.stringify(result.result));

          const ethersSignature = ethers.utils.splitSignature(result.result);

          setSignature({ r: ethersSignature.r, s: ethersSignature.s, v: ethersSignature.v.toString() });
        }
      );
    } catch (err) {
      setErrorMessage(err.message);
    }

    setLoading(false);
  };

  const checkAddress = (account) => {
    if (ethers.utils.isAddress(account)) {
      return ethers.utils.getAddress(account);
    } else {
      return account;
    }
  };

  return (
    <Container>
      <Head>
        <title>CallPermit Demo</title>
        <link rel='icon' type='image/png' sizes='32x32' href='/favicon.png' />
        <link rel='stylesheet' href='//cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css' />
      </Head>
      <div style={{ paddingTop: '10px' }} />
      <Menu>
        <Link href='/'>
          <a className='item'>CallPermit Demo dApp</a>
        </Link>
        <Menu.Menu position='right'>
          <a className='item'> {account} </a>
          {{ connected }.connected ? (
            <Button floated='right' icon labelPosition='left' color='green'>
              <Icon name='check'></Icon>
              {networkName}
            </Button>
          ) : (
            <Button floated='right' icon labelPosition='left' onClick={onConnect} primary>
              <Icon name='plus square'></Icon>
              Connect MetaMask
            </Button>
          )}
        </Menu.Menu>
      </Menu>
      <h2>Call Permit Demo</h2>
      <div style={{ width: '50%' }}>
        <Input
          fluid
          label={{ content: 'Contract Address:' }}
          placeholder='Contract you are interacting with...'
          onChange={(input) => {
            let address = checkAddress(input.target.value);
            setTo(address);
          }}
        />
        <br />
        <Input
          fluid
          labelPosition='right'
          type='text'
          placeholder='Amount of tokens...'
          onChange={(input) => {
            let amount;
            if (input.target.value) {
              amount = ethers.utils.parseEther(input.target.value.toString());
            }
            setValue(BigInt(amount));
          }}
        >
          <Label>Value:</Label>
          <input />
          <Label>DEV</Label>
        </Input>
        <br />
        <Input
          fluid
          label={{ content: 'Data:' }}
          placeholder='Data...'
          onChange={(input) => {
            setData(input.target.value);
          }}
        />
        <br />
        <Input
          fluid
          label={{ content: 'GasLimit:' }}
          placeholder='Gas limit for call...'
          onChange={(input) => {
            setGaslimit(BigInt(input.target.value));
          }}
        />
        <br />
        <Input
          fluid
          label={{ content: 'Deadline:' }}
          placeholder='Deadline for call...'
          onChange={(input) => {
            setDeadline(BigInt(input.target.value));
          }}
        />
      </div>
      <br />
      <Form onSubmit={() => signData()} error={!!errorMessage}>
        <Button type='submit' color='orange' loading={loading} disabled={!connected}>
          Sign Data
        </Button>
        <Message style={{ width: '50%' }} error header='Oops!' content={errorMessage} />
      </Form>
      <h4>Signature:</h4>
      <p>
        r: {signature['r'].toString()}
        <br />
        s: {signature['s'].toString()}
        <br />
        v: {signature['v'].toString()}
      </p>
      <p>
        Don't judge the code :) as it is for demostration purposes only. You can check the source code &nbsp;
        <a href='https://github.com/albertov19/callpermit-demo'>here</a>
      </p>
      <br />
    </Container>
  );
};

export default XCMTransactorDemo;
