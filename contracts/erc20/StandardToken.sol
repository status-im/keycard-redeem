pragma solidity ^0.6.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StandardToken is IERC20 {

    uint256 private supply;
    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowed;

    constructor() internal { }

    function transfer(
        address _to,
        uint256 _value
    )
        external
        override(IERC20)
        returns (bool success)
    {
        return transfer(msg.sender, _to, _value);
    }

    function approve(address _spender, uint256 _value)
        external
        override(IERC20)
        returns (bool success)
    {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        external
        override(IERC20)
        returns (bool success)
    {
        if (balances[_from] >= _value &&
            allowed[_from][msg.sender] >= _value &&
            _value > 0) {
            allowed[_from][msg.sender] -= _value;
            return transfer(_from, _to, _value);
        } else {
            return false;
        }
    }

    function allowance(address _owner, address _spender)
        external
        view
        override(IERC20)
        returns (uint256 remaining)
    {
        return allowed[_owner][_spender];
    }

    function balanceOf(address _owner)
        external
        view
        override(IERC20)
        returns (uint256 balance)
    {
        return balances[_owner];
    }

    function totalSupply()
        external
        view
        override(IERC20)
        returns(uint256 currentTotalSupply)
    {
        return supply;
    }

    function mint(
        address _to,
        uint256 _amount
    )
        internal
    {
        balances[_to] += _amount;
        supply += _amount;
        emit Transfer(address(0x0), _to, _amount);
    }

    function transfer(
        address _from,
        address _to,
        uint256 _value
    )
        internal
        returns (bool success)
    {
        if (balances[_from] >= _value && _value > 0) {
            balances[_from] -= _value;
            balances[_to] += _value;
            emit Transfer(_from, _to, _value);
            return true;
        } else {
            return false;
        }
    }


}
