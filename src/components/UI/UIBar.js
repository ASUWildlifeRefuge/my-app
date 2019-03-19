import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import MenuIcon from "@material-ui/icons/Menu";
import IconButton from "@material-ui/core/IconButton";
import ModelAdd from "./ModelAdd";
import ModelMenu from "./ModelMenu";
import Subject from "../../utils/subject";
import SimControls from "./SimControls";

const styles = {
  root: {
    zIndex: 10
  },
  grow: {
    flexGrow: 1
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20
  }
};

class UIBar extends Component {
  state = {
    floraAnchor: null,
    faunaAnchor: null
  }

  handleMenu = anchor => event => {
    if (event.currentTarget !== this.state[anchor]) {
      this.setState({ [anchor]: event.currentTarget });
    }
  }

  handleClose = anchor => () => {
    if (this.state[anchor]) {
      this.setState({ [anchor]: null });
    }
  }

  toggleDrawer = position => () => {
    Subject.next(`toggle ${position}`);
  }

  render () {
    const { classes } = this.props;
    const { floraAnchor, faunaAnchor } = this.state;
    const floraOpen = Boolean(floraAnchor);
    const faunaOpen = Boolean(faunaAnchor);

    return (
      <div className={classes.root}>
        <AppBar position='static'>
          <Toolbar>
            <IconButton
              className={classes.menuButton}
              onClick={this.toggleDrawer("left")}
              color='inherit'
              aria-label='Menu'
            >
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' color='inherit' className={classes.grow}>
              Willapa Refuge
            </Typography>
            <SimControls
              color='inherit'
              className={classes.menuButton}
            />
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

UIBar.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(UIBar);
