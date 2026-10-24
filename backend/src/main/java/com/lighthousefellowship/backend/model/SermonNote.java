package com.lighthousefellowship.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sermon_note")
@AllArgsConstructor
@NoArgsConstructor
@Data
public class SermonNote {

    @Id
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 120)
    private String preacherName;

    @Column(nullable = false, unique = true)
    private LocalDate sermonDate;

    @Column(length = 500)
    private String coverImageUrl;

    @Column(length = 255)
    private String coverImagePublicId;

    // The whole block list in one JSONB column (ADR 0002). Never written without
    // passing NoteContentValidator first.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", nullable = false, columnDefinition = "jsonb")
    private List<NoteBlock> blocks = new ArrayList<>();

    @Column(nullable = false)
    private int contentVersion;

    // null = draft; see NoteStatus.
    private Instant publishAt;

    private UUID createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;
}
