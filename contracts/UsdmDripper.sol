// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Distributor for the 1M test-USDm onboarding reserve.
//
// Deploy notes (Remix):
//   - In the Deploy panel, set the CONTRACT dropdown to "UsdmDripper" (NOT
//     "IERC20" — that's the interface below and can't be deployed; selecting it
//     is what triggers the "contract may be abstract" error).
//   - No constructor arguments: the official mock USDm address and the 1000-USDm
//     drip amount are baked in. Just press Deploy.
//
// After deploy:
//   1. Transfer the 1M USDm to this contract's address (it must hold the funds).
//   2. The reserve drips 1000 USDm per wallet, once each (on-chain claimed[]).
//   3. Point your /api/drip backend at drip()/dripBatch(), or call them directly.
//
// Why a contract instead of a hot account: on-chain claimed[] dedupe (can't be
// replayed to double-fund), batchable dripBatch([...]), and the 1M sits behind a
// fixed per-address cap rather than a raw key.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

contract UsdmDripper {
    // Official mock USDm on MegaETH testnet (the paymaster-supported test cash).
    IERC20 public constant usdm = IERC20(0x72d4db19E3AE6f8ed47B5337ab00D69685277cF4);

    address public owner;
    address public operator;
    uint256 public dripAmount = 1000e18; // 1000 USDm per wallet
    mapping(address => bool) public claimed;

    event Dripped(address indexed user, uint256 amount);
    event DripAmountUpdated(uint256 amount);
    event OperatorUpdated(address indexed operator);

    error NotAuthorized();
    error AlreadyClaimed();
    error DripFailed();

    constructor() {
        owner = msg.sender;
        operator = msg.sender; // change later with setOperator if the backend signs with a different key
    }

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner) revert NotAuthorized();
        _;
    }

    /// @notice Fund one fresh wallet with `dripAmount`. Reverts if already funded.
    function drip(address user) public onlyOperator {
        if (claimed[user]) revert AlreadyClaimed();
        claimed[user] = true;
        if (!usdm.transfer(user, dripAmount)) revert DripFailed();
        emit Dripped(user, dripAmount);
    }

    /// @notice Batch-fund many wallets; silently skips ones already funded.
    function dripBatch(address[] calldata users) external onlyOperator {
        for (uint256 i = 0; i < users.length; i++) {
            address u = users[i];
            if (claimed[u]) continue;
            claimed[u] = true;
            if (!usdm.transfer(u, dripAmount)) revert DripFailed();
            emit Dripped(u, dripAmount);
        }
    }

    function setDripAmount(uint256 a) external { if (msg.sender != owner) revert NotAuthorized(); dripAmount = a; emit DripAmountUpdated(a); }
    function setOperator(address o) external { if (msg.sender != owner) revert NotAuthorized(); operator = o; emit OperatorUpdated(o); }

    /// @notice Recover the remaining reserve (e.g. after the beta).
    function sweep(address to) external {
        if (msg.sender != owner) revert NotAuthorized();
        usdm.transfer(to, usdm.balanceOf(address(this)));
    }
}
