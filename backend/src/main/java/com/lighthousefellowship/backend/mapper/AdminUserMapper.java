package com.lighthousefellowship.backend.mapper;

import com.lighthousefellowship.backend.dto.response.AdminAccountResponseDTO;
import com.lighthousefellowship.backend.model.AdminUser;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AdminUserMapper {

    AdminAccountResponseDTO toAccountResponse(AdminUser adminUser);
}
