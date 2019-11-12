import React from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter, Route} from 'react-router-dom';
import App from './App'
import { loadConfigurations } from './config/config'

  loadConfigurations()
  .then( () => ReactDOM.render(<BrowserRouter><Route path='/' component={App}/></BrowserRouter>,document.getElementById('root')))
  .catch((error) => {
    alert(error) ;
    console.log(error);
  });

