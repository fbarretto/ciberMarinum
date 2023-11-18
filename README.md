# CiberMarinum

This interactive installation is based on a Reaction Diffusion GLSL shader, running in WEBGL, that reacts to a live video stream that is processed by the bodyPix AI model. The parameters of the RD are controlled by the data provided by a set of sensors installed on an aquarium with live plants and by tide high, wind and ocean turbulence at the region where the work is being presented.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

Clone the repository into your web container
Access ciberMarinum folder home

## Usage

Mapping and parameters can be adjusted to fit different setups, for example, it is possible to add new sensors to the arduino and map them to the RD parameters.
RD Parameters are defined at rDef variable as follows:


```javascript
/**
 * Reaction-diffusion definition object.
 * @typedef {Object} RdDef
 * @property {number} da - Diffusion rate of chemical A.
 * @property {number} db - Diffusion rate of chemical B.
 * @property {number} feed - Feed rate of chemical A.
 * @property {number} kill - Kill rate of chemical B.
 * @property {number} dt - Time step.
 * @property {number} iter - Number of iterations.
 */
``````

## License
This project is licensed under the [MIT License](LICENSE).
