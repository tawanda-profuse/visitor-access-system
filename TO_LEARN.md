To prepare for backend architecture design and hardware integration, here are the essential technical questions to ask the security company's operations and hardware engineering team:

### 1. Intercom & Keypad Hardware Specifications

* **Brand & Models:** What specific make, model, and firmware versions of gate intercoms or keypads are currently installed (or planned for deployment)? *(e.g., Hikvision, Dahua, Akuvox, 2N, Axis, or custom microcontrollers like ESP32/Raspberry Pi)*
* **Hardware Capabilities:** Do the existing gate terminals support built-in numeric keypads, optical QR code readers, or NFC/RFID readers?
* **Operating System / Firmware:** Do the intercom units run an open OS (such as embedded Android or Linux) where a custom agent can run, or do they rely on proprietary firmware?

### 2. Communication Protocols & Gate Control

* **Data Transmission:** How do the gate intercoms transmit input data? Do they support outbound HTTP/HTTPS REST API requests, WebSockets, MQTT, SIP, or legacy serial/Wiegand protocols?
* **Relay Mechanism:** Does the intercom unit directly trigger the gate motor relay via built-in dry contacts, or does it communicate with an intermediary controller board (e.g., ZKAccess, Paxton, Gallagher, Centurion)?
* **Command Payload:** Does the hardware vendor provide an API documentation package or SDK for receiving external "unlock" commands from a cloud backend?

### 3. Network Infrastructure & Edge Reliability

* **Internet Connectivity:** How are gate terminals connected to the web at physical sites (wired Ethernet, Wi-Fi, or cellular 4G/5G SIM cards)?
* **Offline Fallback Behavior:** How should the system handle temporary internet outages at the gate? Does the hardware support local database caching of valid codes, or will offline entry rely on a backup guard override/call button?
* **Hardware Encryption:** Can the gate terminals make secure HTTPS/TLS 1.3 calls, or will API requests on the local network require a dedicated hardware bridge/gateway device?

### 4. Testing Environment & Pilot Setup

* **Bench Testing Setup:** Can they provide a standalone test unit (intercom, keypad, and relay controller) for sandbox development before deploying code to an active site?
* **Physical Wiring Responsibility:** Who on their team will handle physical wiring, relay configuration, and IP network setup during integration testing?
* **Pilot Location:** Which specific property or gate will serve as the initial real-world pilot site for live testing once staging passes?
