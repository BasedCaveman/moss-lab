// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Recommended distributor for the 1M test-USDm onboarding reserve.
//
// Why a contract instead of a hot account:
//  - on-chain claimed[] dedupe (the API can't be replayed to double-fund)
//  - batchable drip([...]) — cheap on MegaETH, one tx funds many users
//  - the 1M sits in a contract with a fixed per-address cap, not a raw key
//
// Fund it: transfer the 1M USDm to this contract's address after deploy.
// Drive it: the Kalma backend (operator) calls drip()/dripBatch() right after a
// new wallet connects. Keep an allowlisted operator; rotate via setOperator.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

contract UsdmDripper {
    IERC20 public immutable usdm;
    address public owner;
    address public operator;
    uint256 public dripAmount;            // e.g. 200e18
    mapping(address => bool) public claimed;

    event Dripped(address indexed user, uint256 amount);
    event DripAmountUpdated(uint256 amount);
    event OperatorUpdated(address indexed operator);

    error NotAuthorized();
    error AlreadyClaimed();
    error DripFailed();

    constructor(address _usdm, address _operator, uint256 _dripAmount) {
        usdm = IERC20(_usdm);
        owner = msg.sender;
        operator = _operator;
        dripAmount = _dripAmount;
    }

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner) revert NotAuthorized();
        _;
    }

    /// @notice Fund one fresh wallet. Reverts if already funded.
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
