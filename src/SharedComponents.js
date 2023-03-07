import React from 'react';

class BackArrow extends React.Component {
	render() {
		return (<div className="SquareButton" onClick={this.props.onClick}>
			<p className="noselect">Back</p>
		</div>);
	}
}

export {BackArrow};