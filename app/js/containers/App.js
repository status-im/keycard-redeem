import { connect } from 'react-redux';
import App from '../components/App';

const mapStateToProps = state => ({
  account: state.web3.account,
});

const mapDispatchToProps = dispatch => ({
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
