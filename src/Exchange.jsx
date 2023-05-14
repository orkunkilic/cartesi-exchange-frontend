import React, { useEffect, useState } from 'react';
import { WagmiConfig, createClient, useAccount, useContractWrite, usePrepareContractWrite, erc20ABI } from "wagmi";
import { ConnectKitProvider, ConnectKitButton, getDefaultClient } from "connectkit";
import Logo from './Logo';
import axios from 'axios';
import { ethers } from 'ethers';
import useDebounce from './useDebounce';
const rollupABI = require('./abi/rollup.json');
const portalABI = require('./abi/erc20_portal.json');


const addOrderTransactionData = (side, quantity, price) => {
  const json = `{
    "action": "add_order",
    "side": "${side}",
    "quantity": ${quantity},
    "price": ${price}
  }`

  // string to uint8 array
  return ethers.utils.toUtf8Bytes(json);
}

const cancelOrderTransactionData = (orderId) => {
  const json = `{
    "action": "cancel_order",
    "order_id": "${orderId}"
  }`

  return ethers.utils.toUtf8Bytes(json);
}

function Exchange() {
  const [isCalledOnce, setIsCalledOnce] = useState(false)

  const [asks, setAsks] = useState([])
  const [bids, setBids] = useState([])
  const [userAsks, setUserAsks] = useState([])
  const [userBids, setUserBids] = useState([])

  const [side, setSide] = useState("bid")
  const [quantity, setQuantity] = useState(0)
  const [price, setPrice] = useState(0)
  const debouncedSide = useDebounce(side, 500)
  const debouncedQuantity = useDebounce(quantity, 500)
  const debouncedPrice = useDebounce(price, 500)

  const [depositToken, setDepositToken] = useState("bid")
  const debouncedDepositToken = useDebounce(depositToken === "bid" ? '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' : '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB', 500)

  const [depositAmount, setDepositAmount] = useState(0)
  const debouncedDepositAmount = useDebounce(depositAmount, 500)

  const [userBalances, setUserBalances] = useState([])
  const { address, isConnecting, isDisconnected } = useAccount();

  const { config: depositConfig } = usePrepareContractWrite({
    addressOrName: '0xF8C694fd58360De278d5fF2276B7130Bfdc0192A',
    contractInterface: portalABI,
    functionName: 'erc20Deposit',
    args: [debouncedDepositToken, ethers.utils.parseEther(debouncedDepositAmount.toString()), '0x'],
    enabled: Boolean(depositAmount),
  })
  const { config: approveConfig } = usePrepareContractWrite({
    addressOrName: debouncedDepositToken,
    contractInterface: erc20ABI,
    functionName: 'approve',
    args: ['0xF8C694fd58360De278d5fF2276B7130Bfdc0192A', ethers.utils.parseEther(debouncedDepositAmount.toString())],
    enabled: Boolean(depositAmount),
  })

  
  const { config } = usePrepareContractWrite({
    addressOrName: '0xF8C694fd58360De278d5fF2276B7130Bfdc0192A',
    contractInterface: rollupABI,
    functionName: 'addInput',
    args: [addOrderTransactionData(debouncedSide, ethers.utils.parseEther(debouncedQuantity.toString()), debouncedPrice)],
    enabled: Boolean(quantity && price),
  })
  
  const { write } = useContractWrite(config)
  const { write: depositWrite } = useContractWrite(depositConfig)
  const { write: approveWrite } = useContractWrite(approveConfig)



  const approve = () => {
    console.log('calling approve', depositToken, debouncedDepositToken)
    approveWrite?.()
  }

  const deposit = () => {
    console.log('calling deposit')
    depositWrite?.()
  }

  const addOrder = () => {
    console.log('calling write')
    write?.()
  }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const asks = await (await fetch('http://localhost:8080/asks', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        })).json()
        const bids = await (await fetch('http://localhost:8080/bids', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        })).json()
  
        setAsks(asks)
        setBids(bids)
      } catch (error) {
        console.log("Error: ", error)
      }
    }

    fetchOrders()
    
    const interval = setInterval(async () => {
      await fetchOrders()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchUserOrders = async () => {
      const asks = await (await fetch(`http://localhost:8080/asks?address=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })).json()
      const bids = await (await fetch(`http://localhost:8080/bids?address=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })).json()

      setUserAsks(asks)
      setUserBids(bids)
    }

    const fetchUserBalances = async () => {
      const balances = await (await fetch(`http://localhost:8080/balance?address=${address}`, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      })).json()

      console.log(balances)
      setUserBalances(balances)
    }

    if (address) {
      // fetchUserOrders()
      fetchUserBalances()
    }

    const interval = setInterval(async () => {
      // await fetchUserOrders()
      await fetchUserBalances()
    } , 3000)

    return () => clearInterval(interval)

  }, [address])

  return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          {/* Navbar */}
          <div className="w-full flex justify-between items-center px-4 py-2 bg-gray-800 text-white">
            <div className="flex items-center">
              <Logo />
              <span className="text-3xl font-bold ml-4">Order Book</span>
            </div>

            <div className="flex items-center">
              <ConnectKitButton />
            </div>
          </div>

          {/* Content */}
          {/* 2/3 of screen is order book, 1/3 is operations */}
          <div className="w-full flex flex-row">
            {/* Order book */}
            <div className="w-1/3 flex flex-col items-center">
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-lg font-bold">Asks</span>
                <span className="text-lg font-bold">Bids</span>
              </div>
              
              <div className="w-full flex flex-row">
                <div className="w-1/2 flex flex-col items-center">
                  <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                    <span className="text-lg font-bold">Price</span>
                    <span className="text-lg font-bold">Amount</span>
                  </div>
                  <div className="w-full flex flex-col">
                    {asks.length > 0 && asks.map((ask, index) => (
                      <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-red-400">
                        <span>{ask.price}</span>
                        <span>{Number(ask.quantity) / 10**18}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-1/2 flex flex-col items-center">
                  <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                    <span className="text-lg font-bold">Price</span>
                    <span className="text-lg font-bold">Amount</span>
                  </div>
                  <div className="w-full flex flex-col">
                      
                    {bids.length > 0 && bids.map((bid, index) => (
                      <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-green-400">
                        <span>{bid.price}</span>
                        <span>{Number(bid.quantity) / 10**18}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="w-1/3 flex flex-col items-center">
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-lg font-bold">Your Balances</span>
              </div>
              <div className="w-full flex flex-col">
                <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                  <span className="text-lg font-bold">Price</span>
                  <span className="text-lg font-bold">Amount</span>
                  <span className="text-lg font-bold">Type</span>
                </div>
                <div className="w-full flex flex-col">
                  {userBids.length > 0 && userBids.map((bid, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-green-400">
                      <span>{bid.price}</span>
                      <span>{bid.quantity}</span>
                      <span>Bid</span>
                    </div>
                  ))}
                  {userAsks.length > 0 && userAsks.map((ask, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-red-400">
                      <span>{ask.price}</span>
                      <span>{ask.quantity}</span>
                      <span>Ask</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full flex flex-col">
                <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                  <span className="text-lg font-bold">Token</span>
                  <span className="text-lg font-bold">Total Balance</span>
                  <span className="text-lg font-bold">Available Balance</span>
                </div>
                <div className="w-full flex flex-col">
                  {userBalances.length > 0 && userBalances.map((balance, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                      <span>{balance.token}</span>
                      <span>{balance.total / 10**18}</span>
                      <span>{balance.available / 10**18}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="w-1/3 flex flex-col items-center">
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-lg font-bold">Operations</span>
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <span className="text-lg font-bold">Token</span>
                <input className="w-1/2" type="text" value={side} onChange={e => setSide(e.target.value)} />
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <span className="text-lg font-bold">Price</span>
                <input className="w-1/2" type="text" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <span className="text-lg font-bold">Amount</span>
                <input className="w-1/2" type="text" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <button
                  className="w-32 h-8 mb-4 flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white"
                  onClick={addOrder}
                >
                  <span className="text-lg font-bold">Add Order</span>
                </button>
              </div>
              
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-lg font-bold">Deposit</span>
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <span className="text-lg font-bold">Token</span>
                <input className="w-1/2" type="text" value={depositToken} onChange={e => setDepositToken(e.target.value)} />
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <span className="text-lg font-bold">Amount</span>
                <input className="w-1/2" type="text" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              </div>
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                <button
                  className="w-32 h-8 mb-4 flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white"
                  onClick={approve}
                >
                  <span className="text-lg font-bold">Approve</span>
                </button>
                <button
                  className="w-32 h-8 mb-4 flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white"
                  onClick={deposit}
                >
                  <span className="text-lg font-bold">Deposit</span>
                </button>
              </div>

            </div>
          </div>
        </div>
  )
}

export default Exchange