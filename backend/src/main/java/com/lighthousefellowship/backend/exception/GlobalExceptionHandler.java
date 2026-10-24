package com.lighthousefellowship.backend.exception;

import com.lighthousefellowship.backend.dto.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import java.time.Clock;
import java.time.Instant;
import java.util.stream.Collectors;

// Maps every exception to one ApiErrorResponse shape. Expected client errors are
// logged at INFO without a stack trace; only the 500 fallback logs at ERROR, once,
// here (observability-and-logging).
@RestControllerAdvice
@AllArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final Clock clock;

    @ExceptionHandler(SermonNoteNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, exception.getMessage(), request);
    }

    @ExceptionHandler({
            SermonNoteContentValidationException.class,
            InvalidSermonDateException.class,
            SermonNoteNotPublishableException.class,
            CoverImageValidationException.class,
            InvalidNoteFilterException.class
    })
    public ResponseEntity<ApiErrorResponse> handleDomainValidation(RuntimeException exception, HttpServletRequest request) {
        log.info("Rejected {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    @ExceptionHandler(DuplicateSermonDateException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateSermonDate(RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, exception.getMessage(), request);
    }

    // The service checks for a duplicate Sunday before saving; this covers two saves
    // racing for the same date, where the unique constraint is the last line.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        String detail = String.valueOf(exception.getMostSpecificCause().getMessage());
        if (detail.contains("uk_sermon_note_sermon_date")) {
            return build(HttpStatus.CONFLICT, "A sermon note already exists for that Sunday", request);
        }
        log.error("Data integrity violation on {} {}", request.getMethod(), request.getRequestURI(), exception);
        return build(HttpStatus.CONFLICT, "The request conflicts with existing data", request);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, exception.getMessage(), request);
    }

    // 400, not 401: the caller's token is valid, only the typed current password is
    // wrong. Clients treat 401 as "session expired" and sign out.
    @ExceptionHandler(IncorrectPasswordException.class)
    public ResponseEntity<ApiErrorResponse> handleIncorrectPassword(RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    @ExceptionHandler(CoverImageUploadException.class)
    public ResponseEntity<ApiErrorResponse> handleCoverImageUpload(
            CoverImageUploadException exception,
            HttpServletRequest request
    ) {
        log.error("Cover image upload failed on {}", request.getRequestURI(), exception);
        return build(HttpStatus.BAD_GATEWAY, exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::describe)
                .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, message.isEmpty() ? "Validation failed" : message, request);
    }

    // Malformed JSON, an unknown field, or a value of the wrong type (for example an
    // unknown block type). The message names the JSON path but never echoes the body.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception,
            HttpServletRequest request
    ) {
        String message = "Malformed request body";
        if (exception.getCause() instanceof JacksonException jacksonException) {
            String path = jsonPath(jacksonException);
            if (jacksonException instanceof UnrecognizedPropertyException unrecognized) {
                message = "Unknown field: " + (path.isEmpty() ? unrecognized.getPropertyName() : path);
            } else if (!path.isEmpty()) {
                message = path + ": invalid value";
            }
        }
        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, exception.getName() + ": invalid value", request);
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(Exception exception, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSize(
            MaxUploadSizeExceededException exception,
            HttpServletRequest request
    ) {
        return build(HttpStatus.CONTENT_TOO_LARGE, "The file is too large", request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException exception,
            HttpServletRequest request
    ) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, exception.getMessage(), request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException exception, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Not found", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), exception);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong", request);
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message, HttpServletRequest request) {
        ApiErrorResponse body = new ApiErrorResponse(
                Instant.now(clock),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI()
        );
        return ResponseEntity.status(status).body(body);
    }

    private static String describe(FieldError fieldError) {
        return fieldError.getField() + ": " + fieldError.getDefaultMessage();
    }

    // "blocks[2].type" from Jackson's reference chain.
    private static String jsonPath(JacksonException exception) {
        StringBuilder path = new StringBuilder();
        for (JacksonException.Reference reference : exception.getPath()) {
            if (reference.getPropertyName() != null) {
                if (!path.isEmpty()) {
                    path.append('.');
                }
                path.append(reference.getPropertyName());
            } else if (reference.getIndex() >= 0) {
                path.append('[').append(reference.getIndex()).append(']');
            }
        }
        return path.toString();
    }
}
