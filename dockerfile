FROM node:22.1.0
WORKDIR /app

# Install dependencies
RUN apt-get update
RUN apt-get install -y python3 python3-pip iputils-ping

# Expose the ports:
# 9000 for Node.js signaling (WebSocket/HTTP) traffic
# 40000-40999 for WebRTC media (RTP/RTCP) traffic
EXPOSE 9000
EXPOSE 50000-50999/udp
EXPOSE 50000-50999/tcp

# Copy the rest of the application
COPY . .
RUN yarn
