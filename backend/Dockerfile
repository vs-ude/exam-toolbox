# Use a Debian-based image with Deno
FROM denoland/deno:latest

# Install necessary tools and libraries
RUN apt-get update && apt-get install -y \
    texlive-full \
    gcc \
    g++ \
    bash \

    # only needed when the python script in the exam template is used
    # python3-pip \
    # python3 \

    # needed for installing openpyxl with pip in an virtual environment
    # python3-venv \
    && apt-get clean

# creates virtual env for Python dependencies (only needed when python script in the exam template is used)
# RUN python3 -m venv /app/venv
# # install openpyxl from venv
# RUN /app/venv/bin/pip install openpyxl
# # update PATH to include the venv's bin directory
# ENV PATH="/app/venv/bin:${PATH}"

# Set the working directory
WORKDIR /app

# Copy the backend files into the container
COPY . /app

# Expose the server port
EXPOSE 3000

# Set environment variables
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB

# Run the server.ts script using Deno
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-write", "--allow-read", "--allow-run", "--allow-import", "server.ts"]
