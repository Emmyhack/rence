// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RenceForum {
    struct Post {
        address author;
        string content;
        uint256 timestamp;
    }

    Post[] public posts;

    event PostCreated(address indexed author, string content, uint256 timestamp);
    event GroupPromoted(address indexed promoter, string groupName, uint256 timestamp);

    constructor() {
        // Initialization logic
    }

    function createPost(string calldata content) external {
        posts.push(Post({author: msg.sender, content: content, timestamp: block.timestamp}));
        emit PostCreated(msg.sender, content, block.timestamp);
    }

    function promoteGroup(string calldata groupName) external {
        emit GroupPromoted(msg.sender, groupName, block.timestamp);
    }

    function getPosts() external view returns (Post[] memory) {
        return posts;
    }

    // Additional functions as needed
} 