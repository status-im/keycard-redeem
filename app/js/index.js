import EmbarkJS from 'Embark/EmbarkJS';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import thunkMiddleware from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import createRootReducer from './reducers';
import { initWeb3 } from './actions/web3';
import App from './containers/App';

const logger = (store) => {
  return (next) => {
    return (action) => {
      console.log('dispatching\n', action);
      const result = next(action);
      console.log('next state\n', store.getState());
      return result;
    }
  }
};

let middlewares = [
  thunkMiddleware,
];

if (true || process.env.NODE_ENV !== 'production') {
  middlewares = [
    ...middlewares,
    logger
  ];
}

const store = createStore(
  createRootReducer(),
  applyMiddleware(...middlewares),
);

EmbarkJS.onReady((err) => {
  store.dispatch(initWeb3());

  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("root")
  );
});
