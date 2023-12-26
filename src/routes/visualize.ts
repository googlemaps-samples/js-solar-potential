/*
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import type { GeoTiff } from './solar';

// [START visualize_render_rgb]
/**
 * Renders an RGB GeoTiff image into an HTML canvas.
 *
 * The GeoTiff image must include 3 rasters (bands) which
 * correspond to [Red, Green, Blue] in that order.
 *
 * @param  {GeoTiff} rgb   GeoTiff with RGB values of the image.
 * @param  {GeoTiff} mask  Optional mask for transparency, defaults to opaque.
 * @return {HTMLCanvasElement}  Canvas element with the rendered image.
 */
export function renderRGB(rgb: GeoTiff, mask?: GeoTiff): HTMLCanvasElement {
	// Create an HTML canvas to draw the image.
	// https://www.w3schools.com/tags/canvas_createimagedata.asp
	const canvas = document.createElement('canvas');

	// Set the canvas size to the mask size if it's available,
	// otherwise set it to the RGB data layer size.
	canvas.width = mask ? mask.width : rgb.width;
	canvas.height = mask ? mask.height : rgb.height;

	// Since the mask size can be different than the RGB data layer size,
	// we calculate the "delta" between the RGB layer size and the canvas/mask
	// size. For example, if the RGB layer size is the same as the canvas size,
	// the delta is 1. If the RGB layer size is smaller than the canvas size,
	// the delta would be greater than 1.
	// This is used to translate the index from the canvas to the RGB layer.
	const dw = rgb.width / canvas.width;
	const dh = rgb.height / canvas.height;

	// Get the canvas image data buffer.
	const ctx = canvas.getContext('2d')!;
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

	// Fill in every pixel in the canvas with the corresponding RGB layer value.
	// Since Javascript doesn't support multidimensional arrays or tensors,
	// everything is stored in flat arrays and we have to keep track of the
	// indices for each row and column ourselves.
	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			// RGB index keeps track of the RGB layer position.
			// This is multiplied by the deltas since it might be a different
			// size than the image size.
			const rgbIdx = Math.floor(y * dh) * rgb.width + Math.floor(x * dw);
			// Mask index keeps track of the mask layer position.
			const maskIdx = y * canvas.width + x;

			// Image index keeps track of the canvas image position.
			// HTML canvas expects a flat array with consecutive RGBA values.
			// Each value in the image buffer must be between 0 and 255.
			// The Alpha value is the transparency of that pixel,
			// if a mask was not provided, we default to 255 which is opaque.
			const imgIdx = y * canvas.width * 4 + x * 4;
			img.data[imgIdx + 0] = rgb.rasters[0][rgbIdx]; // Red
			img.data[imgIdx + 1] = rgb.rasters[1][rgbIdx]; // Green
			img.data[imgIdx + 2] = rgb.rasters[2][rgbIdx]; // Blue
			img.data[imgIdx + 3] = mask // Alpha
				? mask.rasters[0][maskIdx] * 255
				: 255;
		}
	}

	// Draw the image data buffer into the canvas context.
	ctx.putImageData(img, 0, 0);
	return canvas;
}
// [END visualize_render_rgb]

// [START visualize_render_palette]
/**
 * Renders a single value GeoTiff image into an HTML canvas.
 *
 * The GeoTiff image must include 1 raster (band) which contains
 * the values we want to display.
 *
 * @param  {GeoTiff}  data    GeoTiff with the values of interest.
 * @param  {GeoTiff}  mask    Optional mask for transparency, defaults to opaque.
 * @param  {string[]} colors  Hex color palette, defaults to ['000000', 'ffffff'].
 * @param  {number}   min     Minimum value of the data range, defaults to 0.
 * @param  {number}   max     Maximum value of the data range, defaults to 1.
 * @param  {number}   index   Raster index for the data, defaults to 0.
 * @return {HTMLCanvasElement}  Canvas element with the rendered image.
 */
export function renderPalette({
	data,
	mask,
	colors,
	min,
	max,
	index,
}: {
	data: GeoTiff;
	mask?: GeoTiff;
	colors?: string[];
	min?: number;
	max?: number;
	index?: number;
}): HTMLCanvasElement {
	// First create a palette from a list of hex colors.
	const palette = createPalette(colors ?? ['000000', 'ffffff']);
	// Normalize each value of our raster/band of interest into indices,
	// such that they always map into a value within the palette.
	const indices = data.rasters[index ?? 0]
		.map((x) => normalize(x, max ?? 1, min ?? 0))
		.map((x) => Math.round(x * (palette.length - 1)));
	return renderRGB(
		{
			...data,
			// Map each index into the corresponding RGB values.
			rasters: [
				indices.map((i: number) => palette[i].r),
				indices.map((i: number) => palette[i].g),
				indices.map((i: number) => palette[i].b),
			],
		},
		mask,
	);
}

/**
 * Creates an {r, g, b} color palette from a hex list of colors.
 *
 * Each {r, g, b} value is a number between 0 and 255.
 * The created palette is always of size 256, regardless of the number of
 * hex colors passed in. Inbetween values are interpolated.
 *
 * @param  {string[]} hexColors  List of hex colors for the palette.
 * @return {{r, g, b}[]}         RGB values for the color palette.
 */
export function createPalette(hexColors: string[]): { r: number; g: number; b: number }[] {
	// Map each hex color into an RGB value.
	const rgb = hexColors.map(colorToRGB);
	// Create a palette with 256 colors derived from our rgb colors.
	const size = 256
	const step = (rgb.length - 1) / (size - 1);
	return Array(size)
		.fill(0)
		.map((_, i) => {
			// Get the lower and upper indices for each color.
			const index = i * step;
			const lower = Math.floor(index);
			const upper = Math.ceil(index);
			// Interpolate between the colors to get the shades.
			return {
				r: lerp(rgb[lower].r, rgb[upper].r, index - lower),
				g: lerp(rgb[lower].g, rgb[upper].g, index - lower),
				b: lerp(rgb[lower].b, rgb[upper].b, index - lower),
			};
		});
}

/**
 * Convert a hex color into an {r, g, b} color.
 *
 * @param  {string} color  Hex color like 0099FF or #0099FF.
 * @return {{r, g, b}}     RGB values for that color.
 */
export function colorToRGB(color: string): { r: number; g: number; b: number } {
	const hex = color.startsWith('#') ? color.slice(1) : color;
	return {
		r: parseInt(hex.substring(0, 2), 16),
		g: parseInt(hex.substring(2, 4), 16),
		b: parseInt(hex.substring(4, 6), 16),
	};
}

/**
 * Normalizes a number to a given data range.
 *
 * @param  {number} x    Value of interest.
 * @param  {number} max  Maximum value in data range, defaults to 1.
 * @param  {number} min  Minimum value in data range, defaults to 0.
 * @return {number}      Normalized value.
 */
export function normalize(x: number, max: number = 1, min: number = 0): number {
	const y = (x - min) / (max - min);
	return clamp(y, 0, 1);
}

/**
 * Calculates the linear interpolation for a value within a range.
 *
 * @param  {number} x  Lower value in the range, when `t` is 0.
 * @param  {number} y  Upper value in the range, when `t` is 1.
 * @param  {number} t  "Time" between 0 and 1.
 * @return {number}    Inbetween value for that "time".
 */
export function lerp(x: number, y: number, t: number): number {
	return x + t * (y - x);
}

/**
 * Clamps a value to always be within a range.
 *
 * @param  {number} x    Value to clamp.
 * @param  {number} min  Minimum value in the range.
 * @param  {number} max  Maximum value in the range.
 * @return {number}      Clamped value.
 */
export function clamp(x: number, min: number, max: number): number {
	return Math.min(Math.max(x, min), max);
}
// [END visualize_render_palette]

export function rgbToColor({ r, g, b }: { r: number; g: number; b: number }): string {
	const f = (x: number) => {
		const hex = Math.round(x).toString(16);
		return hex.length == 1 ? `0${hex}` : hex;
	};
	return `#${f(r)}${f(g)}${f(b)}`;
}
