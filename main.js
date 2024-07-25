const Web3 = require("web3");

const dreamBidFee = '0x7849cB5A5623670c328018d8778a75Da11F47084';
const gameRegistry = '0xA29F1b0a0C3490c190781b33ce640E9a3DaD807E';
const BidGame = '0xd8EC62805717245416e839719181c63a9CE4800B';

const stakingYield = '0x1d626523B365137BE1599a1ca7E34cb6Ea5C43b3';

// const dreamBidFeeABI = require('./ABIs/dreamBidFee.json')
// const gameRegistryABI = require('./ABIs/gameRegistry.json')
const stakingYieldABI = require('./ABIs/StakingYield.json')
const ERC20ABI = require('./ABIs/mintToken.json')

const SRS = '0xA144e0c2F4633413F4284D517ad6f34e8C3331D2'
const a1 = '0xd979712531Ac7eDcd588b44d8e51097108aD432B'
const a2 = '0x062FBa4B50bD30E9467Ead0dD240f953529B3aCB'
const a3 = '0x97727DB33f97E6fd538FFa1801ff7E0bb00b379f'
const a4 = '0x139af563cdd3612e63c6eC24Db64F2f3AC5f127D'

init = async() => {
    if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        console.log("Connected");
      } else {
        alert("Metamask not found");
      }

    //   dreamBidFeeMethods = new web3.eth.Contract(
    //     dreamBidFeeABI.abi,
    //     dreamBidFee
    //   )

    //   gameRegistryMethods = new web3.eth.Contract(
    //     gameRegistryABI.abi,
    //     gameRegistry
    //   )

    StakingYield = new web3.eth.Contract(
        stakingYieldABI.abi,
        stakingYield
      )
      // console.log("dreamBidFeeMethods", dreamBidFeeMethods.methods)
      accounts = await web3.eth.getAccounts();
      console.log("Account", accounts[0]);
}



Approve = async () => {
  document.getElementById('123').innerHTML = 'Processing🔜';
  contractERC20 = new web3.eth.Contract(
    ERC20ABI.abi,
    SRS
  );
  await contractERC20.methods
    .approve(stakingYield, tokenamount1.value)
    .send({ from: accounts[0] });
  console.log("approved");
  document.getElementById('123').innerHTML = "Approved👍";
}
const tokenamount1 = document.getElementById("tokenamount1");
const btnApprove = document.getElementById("btnApprove");
btnApprove.onclick = Approve;

Stake = async () => {
  document.getElementById('span2').innerHTML = 'Processing🔜';
  await StakingYield.methods.stake(
    setCompetitor.value,
    Amount_.value
  ).send({ from: accounts[0] })
  .once("receipt", (reciept) => {
    console.log(reciept);
    document.getElementById('span2').innerHTML = "Staked✅";
  });
}
const setCompetitor = document.getElementById("setCompetitor");
const Amount_ = document.getElementById("Amount_");
const setCompetitors = document.getElementById("setCompetitors");
setCompetitors.onclick = Stake;


CheckEarnings = async () => {
  const receipt = await StakingYield.methods.earned(ValidatorAddress.value)
  .call();
  document.getElementById('span3').innerHTML = receipt;
  console.log(receipt);
}


const ValidatorAddress = document.getElementById("ValidatorAddress");
const getCompetitors = document.getElementById("getCompetitors");
getCompetitors.onclick = CheckEarnings;

claimRewards = async () => {
  document.getElementById('span5').innerHTML = 'Processing🔜';
  await StakingYield.methods.getReward()
  .send({ from: accounts[0] })
  .once("receipt", (reciept) => {
    console.log(reciept);
    document.getElementById('span5').innerHTML = 'Removed✅';
  });
console.log("Removed!");
}
const removeBidder = document.getElementById("removeBidder");
removeBidder.onclick = claimRewards


init();