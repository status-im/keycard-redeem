import React from 'react';
import {
  useDispatch,
} from 'react-redux';
import { start } from "../actions/home";

export default function() {
  const dispatch = useDispatch()

  return <>
    <button onClick={ () => dispatch<any>(start()) }>START</button>
  </>;
}
