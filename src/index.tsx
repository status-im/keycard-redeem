import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import thunkMiddleware from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, Middleware, MiddlewareAPI, Dispatch } from 'redux';
import createRootReducer from './reducers';
import { initializeWeb3 } from './actions/web3';
import { routerMiddleware, ConnectedRouter } from 'connected-react-router';
import { Route, Switch } from 'react-router';
import { createHashHistory } from 'history';
import ErrorBoundary from './components/ErrorBoundary';
import App from './components/App';
import Home from './components/Home';
import Redeem from './components/Redeem';
import { redeemPath } from './config';

const logger: Middleware = ({ getState }: MiddlewareAPI) => (next: Dispatch) => action => {
  console.log('will dispatch', action);
  const returnValue = next(action);
  console.log('state after dispatch', getState());
  return returnValue;
}

const history = createHashHistory();

let middlewares: Middleware[] = [
  routerMiddleware(history),
  thunkMiddleware,
];

if (true || process.env.NODE_ENV !== 'production') {
  middlewares = [
    ...middlewares,
    logger
  ];
}

const store = createStore(
  createRootReducer(history),
  applyMiddleware(...middlewares),
);

store.dispatch<any>(initializeWeb3());

ReactDOM.render(
  <ErrorBoundary>
    <Provider store={store}>
      <App>
        <ConnectedRouter history={history}>
          <Switch>
            <Route exact path="/"><Home /></Route>
            <Route exact path={redeemPath}><Redeem /></Route>
            <Route render={() => "page not found"} />
          </Switch>
        </ConnectedRouter>
      </App>
    </Provider>
  </ErrorBoundary>,
  document.getElementById("root")
);
