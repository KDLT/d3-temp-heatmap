import React, { Component } from 'react';
import { render } from 'react-dom';
import Heatmap from './components/Heatmap';
import './styles/main.scss';

class App extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
       
    }
  };
  
  render() {
    return (
        <Heatmap />
    )
  }
}

render(
  <App />,
  document.getElementById('root')
);