import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradientButton from './GradientButton';

test('renders the button', () => {
  render(<GradientButton>{'Test Button'}</GradientButton>);
  const buttonElement = screen.getByText('Test Button');
  expect(buttonElement).toBeInTheDocument();
});

test('triggers onClick event when clicked', () => {
  const handleClick = jest.fn();
  render(<GradientButton onClick={handleClick}>{'Test Button'}</GradientButton>);
  const buttonElement = screen.getByText('Test Button');
  userEvent.click(buttonElement);
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('renders the button with default borderWidth and backgroundGradient', () => {
  render(<GradientButton>{'Test Button'}</GradientButton>);
  const buttonElement = screen.getByText('Test Button');
  expect(buttonElement).toHaveStyle({ borderWidth: '1px' });
  expect(buttonElement).toHaveStyle({ backgroundGradient: 'linear-gradient(90deg, #fc8549 0%, #ff4d00 100%)' }); // assuming 'FIRE_PRIMARY' is this gradient
});

test('renders the button with custom borderWidth and backgroundGradient', () => {
  const customGradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';
  render(<GradientButton borderWidth={2} backgroundGradient={customGradient} >{'Test Button'}</GradientButton>);
  const buttonElement = screen.getByText('Test Button');
  expect(buttonElement).toHaveStyle({ borderWidth: '2px' });
  expect(buttonElement).toHaveStyle({ backgroundGradient: customGradient });
});

test('renders the children correctly', () => {
  render(<GradientButton><div data-testid="test-div"></div></GradientButton>);
  const childElement = screen.getByTestId('test-div');
  expect(childElement).toBeInTheDocument();
});
