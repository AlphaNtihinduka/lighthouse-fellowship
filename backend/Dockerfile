# -- Build ---------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-25-alpine AS builder

WORKDIR /app

# Dependencies first, so a code-only change reuses this layer.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
# Tests already ran in CI (and need Docker for Testcontainers, which the build has not).
RUN mvn -B -q package -DskipTests

# -- Runtime -------------------------------------------------------------------
FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

# wget for the Compose healthcheck; installed before dropping root.
RUN apk add --no-cache wget \
    && addgroup -S spring && adduser -S spring -G spring

USER spring

COPY --from=builder /app/target/lighthouse-fellowship-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8081

# The JVM sizes its heap from the container memory limit (docker-compose.yml).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
