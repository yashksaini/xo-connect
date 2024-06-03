# XO Connect

## Table of Contents
- [Introduction](#introduction)
- [Demo](#demo)
- [About the Project](#about-the-project)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Used For](#used-for)
- [Improvements](#improvements)
- [Problems Faced](#problems-faced)
- [Links](#links)
- [Getting Started](#getting-started)

## Introduction
XO Connect is an interactive online platform where users can play tic-tac-toe with others. It features login/signup pages, game challenges, user profiles, and visitor notifications.

## Demo


https://github.com/yashksaini/xo-connect/assets/101442489/0d68d6df-3cad-4f6c-96bb-5e1ad45a1598



## About the Project
XO Connect is a dynamic and engaging online platform designed for users to play tic-tac-toe with others from around the world. This project is built using a modern stack including React, NodeJS, Express JS, MongoDB, Socket.io, and TailwindCSS. The application is structured into several key components, each providing a unique functionality and enhancing the overall user experience.

1. **Login/Signup Pages**: These pages allow users to create an account or log into an existing one. Secure authentication is implemented to ensure user data protection.

2. **Home Page**: Upon logging in, users are directed to the home page, which displays a list of currently online users. From here, users can challenge others to a game of tic-tac-toe, initiating a real-time connection through Socket.io for an interactive gaming experience.

3. **Visits Page**: This page lists all users who have visited the profile of the currently logged-in user. Whenever someone visits a profile, a popup notification is shown, enhancing user interaction and engagement.

4. **Profile Page**: On the profile page, users can view and edit their profile information, including changing their profile picture. The page also displays comprehensive stats such as matches played, wins, losses, ties, and scores, providing users with a detailed overview of their performance.

5. **Players Page**: This section contains a list of all users on the platform. Users can visit the profiles of others from here, fostering a community atmosphere and allowing for easier connection and interaction.

The application is designed to be smooth and user-friendly, providing a seamless experience across both mobile and desktop screens. Additionally, XO Connect can be installed as a progressive web app (PWA), making it easily accessible from mobile devices.

## Technologies Used
- React
- NodeJS
- Express JS
- MongoDB
- Socket.io
- TailwindCSS

## Features
1. Real-time multiplayer tic-tac-toe
2. Secure login and signup
3. List of online users with challenge option
4. Profile visitors list with notifications
5. User profile management with game stats
6. Comprehensive list of all users
7. Mobile-responsive design
8. Progressive web app (PWA) support

## Used For
- Playing tic-tac-toe online
- Tracking game performance
- Interacting with other players
- Managing user profiles

## Improvements
1. Adding new game modes
2. Implementing ranking or leaderboard system
3. Enhancing the notification system
4. Incorporating social media sharing
5. Developing an AI opponent for single-player mode

## Problems Faced
- **Implementing real-time game updates and ensuring smooth performance**
  - Utilized Socket.io for efficient real-time communication and thoroughly tested the application under various conditions to optimize performance.
- **Ensuring data consistency and security during user interactions and data exchanges**
  - Implemented robust authentication mechanisms and used MongoDB for reliable data storage and retrieval.
- **Designing a responsive UI that works well on both mobile and desktop screens**
  - Used TailwindCSS to create a flexible and adaptive design, ensuring a seamless user experience across all devices.

## Links
- [Live Demo](https://xo-connect.netlify.app/)
- [GitHub Repository](https://github.com/yashksaini/xo-connect)

## Getting Started
1. Clone the repository:
    ```bash
    git clone https://github.com/yashksaini/xo-connect.git
    ```
2. Navigate to the project directory:
    ```bash
    cd xo-connect
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Run the application:
    ```bash
    npm start
    ```
5. Open your browser and navigate to `http://localhost:3000`.

Enjoy playing tic-tac-toe on XO Connect!
