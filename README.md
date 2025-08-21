### StakingYield Smart Contract – Technical README

This document explains the `StakingYield` smart contract in this repository. It focuses only on this contract: purpose, roles, state, events, functions, reward math, penalties, and typical usage flows.

## Overview

`StakingYield` is a staking and reward-distribution contract for a single ERC‑20 token. The same token is used for:
- staking (users’ deposits),
- rewards (emissions over time), and
- burning (early withdrawal penalties).

The contract uses OpenZeppelin `Ownable`, `ReentrancyGuard`, and `Pausable`. It requires the token to implement `ERC20Burnable` because early withdrawals may burn a portion of the staked tokens held by the contract.

## Key Design Notes

- **Admin-initiated staking:** `stake(address user, uint256 amount)` is `onlyOwner` and transfers tokens from `msg.sender` (the owner) into the contract while crediting the stake to `user`. The owner must have approved the contract to spend the owner’s tokens. This enables admin- or custodian-managed deposits on behalf of users.
- **Emission model:** Rewards accrue linearly at `rewardRate` tokens per second during an active reward period. Rewards are proportional to each user’s staked share over time.
- **Penalty schedule:** Withdrawing too early applies a burn on the staked principal, depending on how long the user has staked. The burn amount is kept by the contract and then burned from the contract’s balance.
- **Single token:** The same ERC‑20 is used for staking, rewards, and burning.

## Roles & Permissions

- **Owner (admin):**
  - pause/unpause
  - stake on behalf of a user
  - deposit reward tokens
  - set rewards duration
  - start/update rewards via `notifyRewardAmount`
  - recover tokens from the contract

- **User:**
  - withdraw their staked tokens (subject to penalties and pause state)
  - claim earned rewards via `getReward`

## State Variables (selected)

- `IERC20 public immutable Token` – staking/reward token.
- `ERC20Burnable public burnableToken` – same token cast for burning.
- `uint256 public duration` – reward distribution window length (seconds).
- `uint256 public finishAt` – timestamp when current reward period ends.
- `uint256 public updatedAt` – last time reward math was updated.
- `uint256 public rewardRate` – tokens emitted per second.
- `uint256 public rewardPerTokenStored` – cumulative reward-per-token index (scaled by 1e18).
- `mapping(address => uint256) public userRewardPerTokenPaid` – user checkpoint of the index.
- `mapping(address => uint256) public rewards` – accrued but unclaimed rewards per user.
- `uint256 public totalSupply` – total staked principal across users.
- `uint256 public rewardTokens` – reward pool tracked in the contract.
- `mapping(address => uint256) public balanceOf` – user staked principal.
- `mapping(address => uint256) public stakeTimestamps` – when a user last staked.

## Time Constants

- `SIX_MONTHS = 180 days`
- `ONE_YEAR = 365 days`
- `TWO_YEARS = 2 * 365 days`
- `THREE_YEARS = 3 * 365 days`

## Events

- `RewardAdded(uint256 reward)` – reward schedule updated.
- `Staked(address user, uint256 amount)` – stake credited to `user`.
- `Withdrawn(address user, uint256 received, uint256 burned)` – user withdrawal with amounts.
- `RewardPaid(address user, uint256 reward)` – user claimed rewards.
- `RewardsDurationUpdated(uint256 newDuration)` – updated emission window.
- `Recovered(address ownerAddress, uint256 amount)` – tokens recovered by owner.
- `RewardTokenDeposited(uint256 amount)` – reward pool topped up.

## Modifiers

- `updateReward(address account)` – updates `rewardPerTokenStored`, `updatedAt`, and refreshes `rewards[account]` and `userRewardPerTokenPaid[account]` when applicable.

## Core Functions

Constructor
- `constructor(address _stakingToken)`
  - Sets `Token` and `burnableToken` to the same token address.
  - `_stakingToken` must support `ERC20Burnable` for burn-based penalties.

Admin Controls
- `pause()` / `unpause()` – toggles contract-wide pause via `Pausable`.
- `setRewardsDuration(uint256 _duration)` – sets the next reward duration; can only be called if the previous period `finishAt < block.timestamp`.
- `depositRewardToken(uint256 _amount)` – pulls `_amount` tokens from owner into the contract and increments `rewardTokens`.
- `notifyRewardAmount(uint256 _amount)` – sets/updates `rewardRate` for the current `duration`.
  - If a previous period is still active, leftover rewards are carried into the new rate: `rewardRate = (_amount + remaining) / duration`.
  - Requires `rewardRate > 0` and `rewardRate * duration <= rewardTokens`.
  - Updates `finishAt` and `updatedAt` and emits `RewardAdded`.
- `recoverERC20(address ownerAddress, uint256 tokenAmount)` – transfers `tokenAmount` of `Token` from the contract to `ownerAddress`.

Staking & Withdrawing
- `stake(address user, uint256 amount)` – `onlyOwner`.
  - Pulls `amount` tokens from `msg.sender` (the owner) and credits the stake to `user`.
  - Updates `balanceOf[user]`, `stakeTimestamps[user]`, and `totalSupply`.
  - Emits `Staked`.
- `withdraw()` – user-initiated; transfers staked principal minus potential burn.
  - Requires not paused.
  - Burn tiers based on time since `stakeTimestamps[msg.sender]`:
    - < 6 months: revert (cannot withdraw)
    - 6–12 months: 50% burn
    - 12–24 months: 20% burn
    - 24–36 months: 10% burn
    - ≥ 36 months: 0% burn
  - Sends `withdrawableAmount = stakedAmount - burnAmount` to user, then burns `burnAmount` from the contract’s token balance. Emits `Withdrawn`.

Rewards
- `lastTimeRewardApplicable()` – min(`finishAt`, `block.timestamp`).
- `rewardPerToken()` – returns updated `rewardPerTokenStored` accounting for time elapsed and `totalSupply`.
- `earned(address account)` – user’s accrued rewards based on stake and index delta.
- `getReward()` – lets the user claim accrued rewards. Sets `rewards[msg.sender] = 0`, decreases `rewardTokens`, transfers reward, and emits `RewardPaid`.

## Reward Mathematics

- Reward accrual is tracked by a cumulative index `rewardPerTokenStored` scaled by 1e18.
- Over time Δt, index increases by: `rewardRate * Δt * 1e18 / totalSupply`.
- User earnings update via `earned(user)`:
  - `(balanceOf[user] * (rewardPerToken() - userRewardPerTokenPaid[user]) / 1e18) + rewards[user]`.

## Typical Operational Flow

1) Admin funds rewards
- Owner calls `depositRewardToken(amount)` after approving the contract.
- Owner sets `setRewardsDuration(durationSeconds)`.
- Owner calls `notifyRewardAmount(amountToDistribute)` to start/refresh emissions.

2) Admin credits user stakes
- Owner calls `stake(user, amount)` after approving the contract to spend owner’s tokens.
- Contract records user stake and timestamp.

3) Users interact
- Users can call `getReward()` anytime to claim accrued rewards while emissions are active or after.
- Users can call `withdraw()` to exit principal, subject to the time-based burn schedule.

## Penalty/Burn Mechanics

- Burns occur on principal when withdrawing before certain maturities.
- The contract transfers the net amount to the user and then calls `burnableToken.burn(burnAmount)`. Since `burn()` burns from `msg.sender`, the burn is applied to tokens still held by the contract.

## Pausing Behavior

- `whenNotPaused` protects `stake`, `withdraw`, `depositRewardToken`, and `notifyRewardAmount`.
- While paused, users cannot withdraw or claim rewards via those protected functions (claiming is not paused in the code; only `getReward()` lacks `whenNotPaused`, so claiming remains allowed).

## Safety & Considerations

- Ensure the token supports `ERC20Burnable`, otherwise burns will revert.
- The owner must pre-fund sufficient `rewardTokens` before calling `notifyRewardAmount`.
- `stake` is admin-only and pulls tokens from the owner; operationally, the owner should mirror user deposits off-chain or custody users’ tokens to avoid mismatches.
- Early withdrawals before 6 months are disallowed entirely.
- `recoverERC20` transfers the staking token to the owner; use with care to avoid draining user principals.

## Deployment

- Deploy `StakingYield` with the address of the ERC‑20 token that supports burning.
- Post-deploy, the owner should:
  - approve the contract for reward funding and staking operations,
  - deposit reward tokens,
  - configure duration,
  - start emissions.

## Minimal Example Sequence

1) Owner approves the contract to spend tokens for rewards and staking.
2) Owner calls `depositRewardToken(1_000_000e18)`.
3) Owner calls `setRewardsDuration(30 days)`.
4) Owner calls `notifyRewardAmount(1_000_000e18)`.
5) Owner stakes for Alice: `stake(alice, 10_000e18)`.
6) Later, Alice calls `getReward()` to claim accrued rewards.
7) After maturity, Alice calls `withdraw()` to receive principal (minus any penalty if early).

## Gas & Reentrancy

- `nonReentrant` protects state-changing external entry points that move tokens.
- Reward math is O(1) per call with simple arithmetic on each interaction.

## File

- Contract: `Contract/stakingYield.sol`

This README documents only the `StakingYield` contract and its behavior.