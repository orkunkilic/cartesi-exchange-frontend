import React, { useEffect, useState } from 'react';
import { WagmiConfig, createClient, useAccount, useContractWrite, usePrepareContractWrite } from "wagmi";
import { ConnectKitProvider, ConnectKitButton, getDefaultClient } from "connectkit";
import Logo from './Logo';
import axios from 'axios';
import { ethers } from 'ethers';
import useDebounce from './useDebounce';
const rollupABI = require('./abi/rollup.json');


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
  const [asks, setAsks] = useState([])
  const [bids, setBids] = useState([])
  const [userAsks, setUserAsks] = useState([])
  const [userBids, setUserBids] = useState([])

  const [side, setSide] = useState("bid")
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(1)
  const debouncedSide = useDebounce(side, 500)
  const debouncedQuantity = useDebounce(quantity, 500)
  const debouncedPrice = useDebounce(price, 500)

  const [userBalances, setUserBalances] = useState([])
  const { address, isConnecting, isDisconnected } = useAccount();

  const { config } = usePrepareContractWrite({
    addressOrName: '0xF8C694fd58360De278d5fF2276B7130Bfdc0192A',
    contractInterface: rollupABI,
    functionName: 'addInput',
    args: [addOrderTransactionData(debouncedSide, debouncedQuantity, debouncedPrice)],
    enabled: Boolean(quantity && price),
  })

  const { write } = useContractWrite(config)

  const addOrder = () => {
    console.log('calling write')
    write?.()
  }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const asks = await (await fetch('http://localhost:8080/asks', {
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        })).json()
        const bids = await (await fetch('http://localhost:8080/bids', {
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        })).json()
  
        setAsks(asks)
        setBids(bids)
      } catch (error) {
        console.log("Error: ", error)
      }
    }

    console.log("fetching orders...")
    fetchOrders()
    console.log("fetched orders")
  }, [])

  useEffect(() => {
    const fetchUserOrders = async () => {
      const asks = await (await fetch(`http://localhost:8080/asks?address=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      })).json()
      const bids = await (await fetch(`http://localhost:8080/bids?address=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      })).json()

      setUserAsks(asks)
      setUserBids(bids)
    }

    const fetchUserBalances = async () => {
      const balances = await (await fetch(`http://localhost:8080/balance?address=${address}`, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      })).json()

      setUserBalances(balances)
    }

    if (address) {
      fetchUserOrders()
      fetchUserBalances()
    }

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
                <span className="text-xl font-bold">Asks</span>
                <span className="text-xl font-bold">Bids</span>
              </div>
              
              <div className="w-full flex flex-row">
                <div className="w-1/2 flex flex-col items-center">
                  <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                    <span className="text-xl font-bold">Price</span>
                    <span className="text-xl font-bold">Amount</span>
                  </div>
                  <div className="w-full flex flex-col">
                    {asks.length > 0 && asks.map((ask, index) => (
                      <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                        <span>{ask.price}</span>
                        <span>{ask.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-1/2 flex flex-col items-center">
                  <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                    <span className="text-xl font-bold">Price</span>
                    <span className="text-xl font-bold">Amount</span>
                  </div>
                  <div className="w-full flex flex-col">
                      
                    {bids.length > 0 && bids.map((bid, index) => (
                      <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                        <span>{bid.price}</span>
                        <span>{bid.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="w-1/3 flex flex-col items-center">
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-xl font-bold">Your Orders</span>
              </div>
              <div className="w-full flex flex-col">
                <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                  <span className="text-xl font-bold">Price</span>
                  <span className="text-xl font-bold">Amount</span>
                  <span className="text-xl font-bold">Type</span>
                </div>
                <div className="w-full flex flex-col">
                  {userBids.length > 0 && userBids.map((bid, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                      <span>{bid.price}</span>
                      <span>{bid.quantity}</span>
                      <span>Bid</span>
                    </div>
                  ))}
                  {userAsks.length > 0 && userAsks.map((ask, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                      <span>{ask.price}</span>
                      <span>{ask.quantity}</span>
                      <span>Ask</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full flex flex-col">
                <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                  <span className="text-xl font-bold">Token</span>
                  <span className="text-xl font-bold">Balance</span>
                </div>
                <div className="w-full flex flex-col">
                  {userBalances.length > 0 && userBalances.map((balance, index) => (
                    <div key={index} className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200">
                      <span>{balance.token}</span>
                      <span>{balance.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="w-1/3 flex flex-col items-center">
              <div className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-800 text-white">
                <span className="text-xl font-bold">Operations</span>
              </div>
              <button className="w-full flex flex-row justify-between items-center px-4 py-2 bg-gray-200" onClick={addOrder}> add order </button>
            </div>
          </div>
        </div>
  )
}

export default Exchange