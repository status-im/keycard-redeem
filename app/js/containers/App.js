import { connect } from 'react-redux';
import App from '../components/App';

const mapStateToProps = state => ({
  initialized: state.web3.networkID,
  networkID: state.web3.networkID,
  account: state.web3.account,
  error: state.web3.error,
});

const mapDispatchToProps = dispatch => ({
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
