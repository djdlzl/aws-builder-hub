# application
FROM spoonarch/al2023-corretto-jdk21:latest

ENV APPLICATION_NAME=${APPLICATION_NAME:-aws-builder-hub} \
    SERVER_PORT=${SERVER_PORT:-8080} \
    CONFIG_SERVER_URL=${CONFIG_SERVER_URL:-http://config.server.url} \
    ACTIVE_PROFILE=${ACTIVE_PROFILE:-} \
    AWS_REGION=${AWS_REGION:-ap-northeast-2} \
    JAVA_INIT_MEM_RATIO=${JAVA_INIT_MEM_RATIO:-80.0} \
    JAVA_MAX_MEM_RATIO=${JAVA_MAX_MEM_RATIO:-80.0}

COPY ./build/libs/*.jar /deployments/app.jar

EXPOSE ${SERVER_PORT:-8080}
