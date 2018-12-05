import React, { Component } from 'react';
class ElementButton extends Component {


    constructor(props) {
        super(props);

        this.button = // TODO: Refactor to use an HTML button or other type of component, use of null anchor tags is highly discouraged
            <li className="dropdown1">
                <a href="javascript:void(1)" className="dropbtn2">{this.props.addText}</a>
                <div className="dropdown-content1">
                    <a onClick={(e) => this.props.increment(this.props.name)} href="#">{this.props.title}</a>
                </div>
            </li>;

        // TODO: Need to add support for svg for custom button shapes
        if (this.props.hasOwnProperty('icon')) {
            this.button = <button id ={this.props.id} onClick={(e) => alert("Clicked" + this.props.id)}>
                <img className={"ui-img"} alt="NOT LOADED" src={this.props.src} />
            </button>;
        }

    }

    render(){
        return this.button;
    }
}
export default ElementButton