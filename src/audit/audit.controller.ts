import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Res,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditQueryService } from './audit-query.service';
import { AuditQueryDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Audit Controller
 * Handles HTTP requests for audit log access
 * Only accessible by ADMIN role
 */
@Controller('audit')
@ApiTags('Audit Logs')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class AuditController {
    constructor(private readonly auditQueryService: AuditQueryService) {}

    @Get()
    @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
    async findAll(@Query() queryDto: AuditQueryDto) {
        return this.auditQueryService.findAll(queryDto);
    }

    @Get('export/csv')
    @ApiOperation({ summary: 'Export audit logs to CSV' })
    async exportCsv(@Query() queryDto: AuditQueryDto, @Res() res: Response) {
        const csv = await this.auditQueryService.exportToCsv(queryDto);

        res.header('Content-Type', 'text/csv');
        res.header(
            'Content-Disposition',
            `attachment; filename="audit-logs-${Date.now()}.csv"`,
        );
        res.send(csv);
    }

    @Get('export/json')
    @ApiOperation({ summary: 'Export audit logs to JSON' })
    async exportJson(@Query() queryDto: AuditQueryDto) {
        return this.auditQueryService.exportToJson(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get audit log by ID' })
    async findById(@Param('id') id: string) {
        const log = await this.auditQueryService.findById(id);
        if (!log) {
            throw new NotFoundException('Audit log not found');
        }
        return log;
    }
}
