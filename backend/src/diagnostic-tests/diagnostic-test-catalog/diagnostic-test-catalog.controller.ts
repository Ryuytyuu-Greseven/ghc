import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DiagnosticTestCatalogService } from './diagnostic-test-catalog.service';

@Controller('diagnostic-tests')
@UseGuards(JwtAuthGuard)
export class DiagnosticTestCatalogController {
  constructor(private readonly service: DiagnosticTestCatalogService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.service.findAll(query);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q ?? '');
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.service.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() body: Record<string, any>) {
    this.assertAdmin(req);
    return this.service.create(body, req.user?.userId ?? '');
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    this.assertAdmin(req);
    return this.service.update(id, body, req.user?.userId ?? '');
  }

  @Delete(':id')
  softDelete(@Req() req: any, @Param('id') id: string) {
    this.assertAdmin(req);
    return this.service.softDelete(id);
  }

  private assertAdmin(req: any) {
    if (req.user?.role !== 'Admin') {
      throw new ForbiddenException('Only administrators can modify the test catalog');
    }
  }
}
